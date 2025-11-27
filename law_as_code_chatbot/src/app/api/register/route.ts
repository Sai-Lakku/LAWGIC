import { NextResponse } from 'next/server';
import connectDB from '@/lib/databse_user/db';
import { User } from '@/lib/databse_user/user';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, code, password } = await req.json();
    await connectDB();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // 验证验证码
    if (user.verificationCode !== code) {
        return NextResponse.json({ message: 'Invalid verification code' }, { status: 400 });
    }

    // 验证是否过期
    if (user.verificationCodeExpires && new Date() > user.verificationCodeExpires) {
        return NextResponse.json({ message: 'Verification code expired' }, { status: 400 });
    }

    // 验证通过！设置正式密码，标记为已验证，清空验证码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    user.password = hashedPassword;
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    return NextResponse.json({ message: 'Registration successful' }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error registering user' }, { status: 500 });
  }
}