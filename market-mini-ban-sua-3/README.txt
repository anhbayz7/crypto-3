MARKET MINI V3 - HƯỚNG DẪN CHO NGƯỜI KHÔNG BIẾT LẬP TRÌNH
=========================================================
Bản cũ lỗi vì mở HTML trực tiếp khiến các API có thể từ chối truy cập/CORS.
Bản v3 có hàm lấy dữ liệu máy chủ: /netlify/functions/market.mjs.
Không được chỉ tải public/index.html về rồi nhấp đúp: khi đó API sẽ không có.

TRIỂN KHAI ĐỂ CÓ LINK WEB (CẦN CÓ CHỨC NĂNG MÁY CHỦ)
1. Giải nén market-mini-ban-sua-3.zip.
2. Tạo repo GitHub mới; upload nội dung dự án gồm: netlify.toml, public/index.html và netlify/functions/market.mjs.
3. Đăng nhập Netlify https://app.netlify.com/ -> Add new project -> Import an existing project -> GitHub -> chọn repository vừa upload -> Deploy.
4. Netlify sẽ build website và Netlify Function. Sau khi có URL (vd: https://ten-cua-ban.netlify.app), truy cập đường dẫn https://ten-cua-ban.netlify.app/api/market?health=1
5. Thành công sẽ xuất hiện JSON có "ok": true. Nếu báo 404, vào Netlify -> Functions kiểm tra function tên "market"; xem lại bước deploy bằng Git, không chỉ tải HTML tĩnh.
6. Mở URL gốc, chọn BTC hoặc EUR/USD và bấm "Phân tích ngay".

LƯU Ý: Kéo ZIP vào Netlify Drop đôi khi chỉ phát hành site tĩnh mà KHÔNG build hàm máy chủ, nên không nên chọn cách này cho bản v3. Nếu muốn triển khai không dùng Git, Netlify CLI có thể thực hiện có build, nhưng cần cài Node.js và Netlify CLI. Cách Git ở trên ổn định và dễ nâng cấp hơn.

DỮ LIỆU
- Crypto: Binance Spot (ưu tiên) -> Coinbase -> Kraken, nến đóng.
- Forex/vàng: lấy snapshot chỉ báo từ TradingView Scanner qua hàm máy chủ; endpoint này KHÔNG phải API công khai có cam kết ổn định. Nếu TradingView từ chối truy cập, web hiển thị lỗi rõ; không đoán số.
- Nếu có Twelve Data API key phù hợp, điền vào ô Forex. Khi đó web thử lấy nến của Twelve Data thay vì snapshot TradingView, có thể bị giới hạn gói API và quyền truy cập khung thời gian.
- Tín hiệu 1h/5h/12h/24h/1 tháng/1 năm là cách diễn giải chỉ báo theo khung được chọn, KHÔNG phải lời khẳng định giá chắc chắn đạt một mục tiêu trong khoảng này.
- Trang mini chưa tự phân tích tin tức thế giới theo thời gian thực; link tin tức và lịch kinh tế để kiểm tra.

KIỂM TRA LOCAL DÀNH CHO NGƯỜI BIẾT LẬP TRÌNH
Netlify CLI: npx netlify dev. Dự án không cần npm install package riêng.

KHÔNG lưu khóa API vào file HTML, không đưa lên Git công khai.
