export const AUTH_ERRORS = {
  invalid_credentials: 'Email hoặc mật khẩu không đúng',
  token_expired: 'Phiên đăng nhập đã hết hạn',
  token_invalid: 'Phiên đăng nhập không hợp lệ',
  unauthorized: 'Vui lòng đăng nhập để tiếp tục',
  forbidden: 'Bạn không có quyền truy cập',
  email_taken: 'Email đã được sử dụng',
  refresh_token_invalid: 'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại',
  wrong_password: 'Mật khẩu hiện tại không đúng',
  same_password: 'Mật khẩu mới phải khác mật khẩu hiện tại',
} as const;

export const USER_ERRORS = {
  not_found: 'Không tìm thấy người dùng',
  already_exists: 'Người dùng đã tồn tại',
  invalid_role: 'Vai trò không hợp lệ',
  cannot_delete_self: 'Bạn không thể xoá tài khoản của chính mình',
} as const;

export const VALIDATION_ERRORS = {
  invalid_email: 'Địa chỉ email không hợp lệ',
  password_too_short: 'Mật khẩu phải có ít nhất 8 ký tự',
  required_field: 'Trường này là bắt buộc',
} as const;

export const GENERAL_ERRORS = {
  internal_server_error: 'Đã xảy ra lỗi, vui lòng thử lại sau',
  not_found: 'Không tìm thấy tài nguyên',
  bad_request: 'Yêu cầu không hợp lệ',
} as const;
