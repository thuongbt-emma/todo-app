# To-do cá nhân

App quản lý việc cá nhân, thay cho sticky note. Gõ việc nhanh như ghi chú, nhưng việc đã xong không mất đi mà được lưu lại để xem Nhật ký và Thống kê.

Giao diện tiếng Việt, dùng được trên máy tính lẫn điện thoại. App dành cho **một người dùng**: mỗi người tự chạy một bản riêng.

## Tính năng

- **Nhập nhanh** một dòng là thành thẻ có các bước:
  `AP27: chờ Duý 2/10, final 5/10, submit @c Na 6/10 #event !urgent`
  - `Tên thẻ: bước 1, bước 2` → một thẻ với các bước
  - `5/10` → hạn của bước
  - `@c Na` → người liên quan
  - `#event` → tag
  - `!urgent` → nhóm (Urgent, Đang làm, Later, Waiting… tự đặt được)
  - Gõ trùng tên một thẻ đang mở → thêm bước vào thẻ đó
- **Board** kéo thả thẻ giữa các nhóm. **List** dạng danh sách gọn. **Theo ngày** gom bước theo Quá hạn / Hôm nay / 7 ngày tới.
- **Bước trên thẻ** tự xếp: bước có hạn gần nhất lên đầu, bước đã xong tụt xuống cuối và gạch ngang. Nút 👁 để ẩn hoặc hiện việc đã xong. Sửa, thêm, kéo đổi thứ tự bước ngay trên thẻ.
- **Hoàn tác** mọi thao tác: nút "Hoàn tác" trên thông báo, hoặc Ctrl+Z (Cmd+Z trên Mac).
- **Nhật ký** việc đã xong theo ngày hoặc tuần, tìm kiếm được. **Thống kê** số việc xong theo tuần và theo tag.
- **Ghi chú** để lưu địa chỉ, số điện thoại, mẫu tin nhắn. Số điện thoại bấm để gọi.
- **Cài đặt**: giao diện sáng/tối, màu nhấn, quản lý nhóm, tag và người, nhập nhiều dòng từ sticky note, thùng rác (không có gì bị xoá vĩnh viễn ngay).

## Công nghệ

Next.js 16 (App Router), React 19, Tailwind CSS 4, Prisma 7, PostgreSQL, Vitest.

## Chạy trên máy

Cần **Node.js 22+**. Không cần cài Postgres: script `npm run db` tự tải và chạy một Postgres riêng trên cổng 5434.

```bash
npm install
cp .env.example .env
```

Mở `.env` và đặt:
- `SESSION_SECRET`: một chuỗi ngẫu nhiên 64 ký tự hex. Tạo bằng `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- Mật khẩu đăng nhập: chạy `npm run hash-password -- "mật-khẩu-của-bạn"` rồi dán kết quả (`scrypt:…`) vào `APP_PASSWORD_HASH`.
- Hoặc đặt `AUTH_DISABLED="true"` nếu không muốn đăng nhập (xem lưu ý ở mục Đăng nhập).

Chạy database (để cửa sổ này chạy), rồi ở cửa sổ khác:

```bash
npm run db                 # Postgres trên cổng 5434
npx prisma migrate deploy  # tạo bảng
npm run db:seed            # tạo 4 nhóm mặc định
npm run dev                # mở http://localhost:3100
```

Kiểm thử:

```bash
npm test          # unit test
npm run test:int  # integration test (cần `npm run db` đang chạy)
```

## Đăng nhập

- Mặc định app yêu cầu mật khẩu: đặt `APP_PASSWORD_HASH` (tạo bằng `npm run hash-password`) và `SESSION_SECRET`.
- Đặt `AUTH_DISABLED="true"` để tắt hẳn đăng nhập. **Khi đó ai có link cũng xem và sửa được toàn bộ dữ liệu**, chỉ nên dùng khi link không công khai.

## Đưa lên server

App có sẵn `Dockerfile`. Khi container khởi động, nó tự chạy `prisma migrate deploy`, `prisma db seed` rồi `next start` trên cổng 3000.

```bash
docker build -t todo-app .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/todo" \
  -e SESSION_SECRET="<64 hex>" \
  -e APP_PASSWORD_HASH="scrypt:..." \
  todo-app
```

Biến môi trường:

| Biến | Ý nghĩa |
| --- | --- |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `SESSION_SECRET` | 64 ký tự hex, dùng ký cookie đăng nhập |
| `APP_PASSWORD_HASH` | Kết quả của `npm run hash-password`; không cần khi `AUTH_DISABLED=true` |
| `AUTH_DISABLED` | `true` để tắt đăng nhập |

Triển khai lên Dokploy hoặc các nền tảng tương tự: xem [DEPLOYMENT.md](DEPLOYMENT.md).

## Bắt đầu dùng

1. Vào **Cài đặt → Nhập nhiều dòng**, dán nội dung sticky note hiện có. Dòng chỉ có tên nhóm (`Urgent`, `Đang làm`, `Later`, `Waiting`) sẽ xếp các dòng phía sau vào nhóm đó.
2. Từ đó, gõ việc mới ở ô nhập nhanh trên cùng (phím tắt **N**), bấm **?** cạnh ô để xem cú pháp.
3. Xong việc thì tick bước hoặc bấm "✓ Hoàn thành thẻ", đừng xoá, để Nhật ký và Thống kê ghi nhận.
