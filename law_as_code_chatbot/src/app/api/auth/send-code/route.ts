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
import nodemailer from 'nodemailer'; // 引入邮件库

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    await connectDB();

    // 1. 检查用户状态
    let user = await User.findOne({ email });
    if (user && user.isVerified) {
        return NextResponse.json({ message: 'User already exists. Please login.' }, { status: 400 });
    }

    // 2. 生成验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10分钟有效期

    // 3. 更新或创建数据库记录
    if (!user) {
        // 创建临时用户
        const tempPassword = await bcrypt.hash(Math.random().toString(), 10);
        user = await User.create({ 
            email, 
            password: tempPassword,
            verificationCode: code,
            verificationCodeExpires: expires,
            isVerified: false
        });
    } else {
        // 更新未验证的老用户
        user.verificationCode = code;
        user.verificationCodeExpires = expires;
        await user.save();
    }

    // 4. 配置邮件发送器 (使用 Gmail)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // 从 .env 读取
        pass: process.env.EMAIL_PASS, // 从 .env 读取
      },
    });

    // 5. 发送邮件
    // 这里我们设计一个简单的 HTML 邮件样式
    const mailOptions = {
      from: `"LAWGIC Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your LAWGIC Verification Code',
      text: `Your verification code is: ${code}`, // 纯文本备份
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">LAWGIC</h2>
          <p>Hello,</p>
          <p>You are registering for LAWGIC. Please use the following code to complete your sign-up:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #000;">${code}</span>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="font-size: 12px; color: #666; margin-top: 30px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email}`);

    return NextResponse.json({ message: 'Code sent successfully' }, { status: 200 });

  } catch (error) {
    console.error("❌ Send Email Error:", error);
    return NextResponse.json({ message: 'Failed to send email' }, { status: 500 });
  }
}