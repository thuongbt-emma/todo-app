# Triển khai

App build bằng `Dockerfile` (cổng 3000). Khi container khởi động: `prisma migrate deploy` → `prisma db seed` (idempotent) → `next start`. Migration và seed chạy lại mỗi lần khởi động, an toàn với dữ liệu sẵn có.

## Biến môi trường (đặt trên server, không commit)

| Biến | Giá trị |
| --- | --- |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `SESSION_SECRET` | 64 ký tự hex, ví dụ `openssl rand -hex 32` |
| `APP_PASSWORD_HASH` | Kết quả `npm run hash-password -- "<mật khẩu>"`; chỉ cần khi bật đăng nhập |
| `AUTH_DISABLED` | `true` tắt đăng nhập (ai có link cũng đọc/sửa được) |

`DATABASE_URL` chỉ cần lúc chạy; lúc build image dùng giá trị giả.

## Dokploy (hoặc nền tảng tương tự)

1. Tạo một database PostgreSQL, lấy chuỗi kết nối nội bộ.
2. Tạo app, kiểu build **Dockerfile**, cổng 3000, gắn domain + HTTPS.
3. Đặt các biến môi trường ở trên, rồi deploy.

### Deploy bằng cách upload zip ("drop")

Dokploy từ chối file zip có đường dẫn chứa `(`, `)`, `[`, `]` hoặc `...`, mà thư mục route `src/app/(app)` có dấu ngoặc. Dùng script để mã hoá tên thư mục trước khi upload; `Dockerfile` tự khôi phục lại trước khi build:

```sh
scripts/make-upload.sh <thư-mục-tạm> main
dokploy app deploy -a <applicationId> -p <projectId> -e <environmentId> -f <thư-mục-tạm> -y
```

Chỉ các file đã commit được upload, nên commit trước khi chạy. Đổi biến môi trường cần deploy lại.

Deploy từ git (Dokploy kết nối GitHub) thì không cần bước mã hoá này.

## Đổi mật khẩu

1. Chạy `npm run hash-password -- "<mật khẩu mới>"`.
2. Thay `APP_PASSWORD_HASH` trên server; có thể đổi luôn `SESSION_SECRET` để đăng xuất mọi phiên cũ.
3. Deploy lại.
