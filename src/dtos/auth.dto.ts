import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @MaxLength(100)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  email!: string;

  @IsString()
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8, { message: 'Mật khẩu hiện tại phải có ít nhất 8 ký tự' })
  @MaxLength(100)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @MaxLength(100)
  newPassword!: string;
}
