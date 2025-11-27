// import { NextResponse } from 'next/server';
// import connectDB from '@/lib//databse_user/db';
// import { User } from '@/lib/databse_user/user';
// import bcrypt from 'bcryptjs';

// export async function POST(req: Request) {
//   try {
//     const { email } = await req.json();
//     await connectDB();

//     // 生成 6 位随机数字
//     const code = Math.floor(100000 + Math.random() * 900000).toString();
//     const expires = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

//     // 检查用户是否已存在
//     let user = await User.findOne({ email });

//     if (user && user.isVerified) {
//         // 如果用户存在且已验证，说明应该去登录，而不是注册
//         return NextResponse.json({ message: 'User already exists. Please login.' }, { status: 400 });
//     }

//     if (!user) {
//         // 如果是新用户，先创建一个临时记录（没有密码，未验证状态）
//         // 这里给个随机密码占位，因为 Schema 里密码是必填的，真正注册时会覆盖
//         const tempPassword = await bcrypt.hash(Math.random().toString(), 10);
//         user = await User.create({ 
//             email, 
//             password: tempPassword,
//             verificationCode: code,
//             verificationCodeExpires: expires,
//             isVerified: false
//         });
//     } else {
//         // 如果用户存在但没验证（比如上次注册了一半），更新验证码
//         user.verificationCode = code;
//         user.verificationCodeExpires = expires;
//         await user.save();
//     }

//     // --- 模拟发送邮件 ---
//     console.log("========================================");
//     console.log(`[开发模式] 发送给 ${email} 的验证码是: ${code}`);
//     console.log("========================================");
//     // 真实环境在这里调用 Resend 或 Nodemailer 发送邮件

//     return NextResponse.json({ message: 'Code sent' }, { status: 200 });

//   } catch (error) {
//     console.error(error);
//     return NextResponse.json({ message: 'Error sending code' }, { status: 500 });
//   }
// }
import { NextResponse } from 'next/server';
import connectDB from '@/lib//databse_user/db';
import { User } from '@/lib/databse_user/user';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    console.log("---------------- START SEND-CODE DEBUG ----------------");
    
    // 1. 打印接收到的原始请求体
    const body = await req.json();
    console.log("1. 接收到的 Body:", body);
    
    const { email } = body;
    console.log("2. 解析出的 Email:", email);

    if (!email) {
      console.log("❌ 错误: Email 为空");
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    // 2. 连接数据库
    console.log("3. 正在连接数据库...");
    await connectDB();
    console.log("✅ 数据库连接成功");

    // 3. 查询用户
    console.log(`4. 正在数据库查找用户: ${email}`);
    let user = await User.findOne({ email });
    console.log("5. 查询结果:", user ? `找到用户 (ID: ${user._id})` : "未找到用户 (null)");

    if (user) {
        console.log("   - 用户 isVerified 状态:", user.isVerified);
    }

    // 4. 判断逻辑
    if (user && user.isVerified) {
        console.log("❌ 拒绝: 用户已存在且已验证，返回 400");
        return NextResponse.json({ message: 'User already exists. Please login.' }, { status: 400 });
    }

    // 5. 生成验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    console.log(`6. 生成验证码: ${code}`);

    if (!user) {
        console.log("7. 创建新临时用户...");
        const tempPassword = await bcrypt.hash(Math.random().toString(), 10);
        user = await User.create({ 
            email, 
            password: tempPassword,
            verificationCode: code,
            verificationCodeExpires: expires,
            isVerified: false
        });
        console.log("✅ 新用户创建成功");
    } else {
        console.log("7. 更新现有未验证用户...");
        user.verificationCode = code;
        user.verificationCodeExpires = expires;
        await user.save();
        console.log("✅ 用户更新成功");
    }

    console.log("---------------- END DEBUG ----------------");
    return NextResponse.json({ message: 'Code sent' }, { status: 200 });

  } catch (error) {
    console.error("❌ 发生严重错误:", error);
    // 这里即使报错也返回 200 并带上错误信息，方便我们在前端看到（仅调试用）
    return NextResponse.json({ message: `Server Error: ${error}` }, { status: 500 });
  }
}