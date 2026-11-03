MARKET MINI PRO v4 • CẬP NHẬT CHO WEBSITE NETLIFY ĐANG CÓ
========================================================

CÀI ĐẶT LÊN GITHUB (KHÔNG TẠO SITE MỚI)
1) Giải nén file "market-mini-v4-cap-nhat.zip".
2) Mở đường dẫn GitHub hiện có:
   https://github.com/anhbayz7/crypto-3/tree/main/market-mini-ban-sua-3
3) Bấm "Add file" -> "Upload files".
4) Kéo 2 THƯ MỤC "public" và "netlify", cùng FILE "netlify.toml"
   vừa giải nén lên ngay vị trí ĐANG MỞ (market-mini-ban-sua-3).
5) Kiểm tra tên các file đúng cấu trúc bên dưới, rồi bấm "Commit changes".
6) Vào Netlify -> Deploys. Netlify kết nối GitHub thường tự deploy.
   Nếu không thì "Trigger deploy" -> "Deploy site".
   KHÔNG đổi Base directory, Publish directory và Functions directory đã
   cấu hình thành công trước đó.

CẤU TRÚC SAU KHI UPLOAD
  repo crypto-3/
    market-mini-ban-sua-3/
      netlify.toml
      public/
        index.html
        app.mjs
        analysis.mjs
      netlify/
        functions/
          market.mjs
          news.mjs

KIỂM TRA SAU KHI TRIỂN KHAI
- Mở link .netlify.app của site đang có, nhấn Ctrl+Shift+R / Cmd+Shift+R.
- Thử BTC/USDT -> 1 giờ -> Phân tích ngay.
- Xem nhãn "LIVE" khi WebSocket Binance đã kết nối. Nến khung 5m hình thành
  được Binance gửi cập nhật khoảng 2 giây; giá giao dịch chạy theo tick nếu có.
- Dưới biểu đồ có MA20/50/100/200, kháng cự hỗ trợ, báo cáo và tin tức.
- Kiểm tra API: https://TEN-SITE.netlify.app/api/market?health=1
- Tin: https://TEN-SITE.netlify.app/api/news?market=crypto&symbol=BTCUSDT

FOREX / VÀNG
- Nếu chưa có khóa dữ liệu, web lấy snapshot chỉ báo từ TradingView scanner
  (nguồn không chính thức, có thể bị giới hạn) và biểu đồ TradingView.
- Muốn phân tích từ NẾN THẬT Forex, tạo khóa API Twelve Data và gắn AN TOÀN
  ở Netlify -> Project configuration -> Environment variables với tên:
  TWELVE_DATA_KEY
  Sau khi lưu biến môi trường, deploy lại. KHÔNG đặt khóa API trong HTML hay
  trong GitHub công khai.
- Nếu không có nguồn streaming Forex được cấp phép thì KHÔNG thể cam kết
  cập nhật giá Forex từng giây cho mọi broker. Các tỷ giá không thống nhất
  tuyệt đối giữa các nguồn và có thể ngừng khi thị trường nghỉ.

TIN TỨC
- Server thử lấy bài viết mới trong 72 giờ qua từ Google News RSS, có nguồn
  và thời gian công bố; dự phòng GDELT. Nếu cả 2 không trả kết quả thì web
  hiện THÔNG BÁO LỖI / KHÔNG CÓ TIN; tuyệt đối không mô phỏng headline.
- Đánh giá yếu tố ảnh hưởng chỉ từ tiêu đề, không giả vờ đọc toàn bộ bài.
- Lịch kinh tế liên kết sang TradingView, không tự nhận là đã xác minh
  các công bố tương lai.

CÁCH TÍNH NHẬN ĐỊNH
- MA20/50/100/200, RSI14, MACD, ATR14, mô hình nến đóng, pivot/swing.
- Vùng đáy/đỉnh tham khảo từ biên ATR * căn bậc hai số nến; KHÔNG phải
  giá chắc chắn hoặc mô hình xác suất đã hiệu chỉnh.
- Hỗ trợ/kháng cự lấy từ các đỉnh đáy đã hình thành trong 150 nến gần nhất
  và đường MA. Điểm mua/bán chỉ đưa ra nếu cấu trúc cho phép, luôn kèm
  điều kiện xác nhận/dừng lỗ; nếu không đủ căn cứ web sẽ cho đứng ngoài.
- KHÔNG tự động vào lệnh, không lưu ví hoặc thông tin người dùng.

LƯU Ý QUAN TRỌNG
- Phiên bản này đã qua kiểm thử thuật toán, API mô phỏng và giao diện trình
  duyệt bằng DỮ LIỆU KIỂM THỬ. Chưa xác nhận nguồn API hoạt động trên site
  Netlify thật của bạn cho đến khi bạn commit và deploy.
- Crypto chính: Binance Spot; dự phòng Coinbase (cặp USD) / Kraken (cặp USD)
  với nhãn nguồn hiển thị, KHÔNG trộn giá các sàn. "Cập nhật từng giây" là
  luồng tick không đồng nghĩa mỗi giây luôn có giao dịch/tín hiệu mới.
