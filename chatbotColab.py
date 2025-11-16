from flask import Flask, request, jsonify
from flask_cors import CORS
from pyngrok import ngrok
from sentence_transformers import SentenceTransformer, util
import torch
import google.generativeai as genai
import os

BACKEND_URL = "https://libraryphuongb2103514.pagekite.me/api/chatbot"

# Cấu hình Ngrok
!ngrok authtoken 35E1InvyKUj8F2iSLdU6N60wnLM_2DSMWqQTPd7gHXVDH3fC5

# Cấu hình Gemini API (LẤY KEY TẠI: https://makersuite.google.com/app/apikey)
GEMINI_API_KEY = "AIzaSyDkzmIMw2CwvKwa2h4oMG-nNJSkSPUN2kY"  # ⚠️ THAY KEY CỦA BẠN VÀO ĐÂY
genai.configure(api_key=GEMINI_API_KEY)

# ===========================================
# BƯỚC 3: KHỞI TẠO MODEL & BIẾN TOÀN CỤC
# ===========================================
print("⏳ Đang load embedding model...")
embedding_model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
print("✅ Embedding model đã sẵn sàng!")

# Biến lưu trữ database
database_texts = []
database_embeddings = None

# Khởi tạo Gemini model
gemini_model = genai.GenerativeModel('models/gemini-2.5-flash')

# ===========================================
# BƯỚC 4: TẠO FLASK APP
# ===========================================
app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

# Hàm phân loại intent
def classify_intent(user_message):
    """Phân loại câu hỏi của user bằng Gemini"""
    prompt = f"""Bạn là AI phân loại câu hỏi về thư viện.

NHIỆM VỤ: Phân tích câu hỏi và trả về JSON format.

CÂU HỎI: "{user_message}"

DANH SÁCH INTENT:
1. "top_ranking" - Câu hỏi về top/xếp hạng/nhiều nhất/cao nhất
   Sub-intents:
   - "most_borrowed": Top sách nhiều lượt mượn
   - "most_viewed": Top sách nhiều lượt xem
   - "highest_rated": Top sách rating cao nhất
   - "lowest_rated": Top sách rating thấp nhất
   - "newest": Sách mới nhất

2. "general_info" - Thông tin chung về thư viện, quy định, giờ mở cửa...

3. "book_search" - Tìm sách cụ thể theo tên/tác giả

OUTPUT (CHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT KHÁC):
{{
  "intent": "top_ranking" | "general_info" | "book_search",
  "sub_intent": "most_borrowed" | "most_viewed" | "highest_rated" | "lowest_rated" | "newest" | null,
  "parameters": {{
    "limit": <số lượng, mặc định 10>,
    "entity_type": "book"
  }},
  "confidence": <0.0-1.0>
}}

BẮT ĐẦU PHÂN TÍCH:"""

    try:
        response = gemini_model.generate_content(prompt)
        text = response.text.strip()
        
        # Loại bỏ markdown code block
        import re
        json_text = re.sub(r'```json\n?', '', text)
        json_text = re.sub(r'```\n?', '', json_text).strip()
        
        import json
        classification = json.loads(json_text)
        print(f"🎯 Classification: {classification}")
        return classification
        
    except Exception as e:
        print(f"⚠️ Intent classification error: {str(e)}")
        return {
            "intent": "general_info",
            "sub_intent": None,
            "parameters": {},
            "confidence": 0.5
        }
import requests

def call_backend_filter(sub_intent, limit=10):
    """Gọi API backend local để lấy dữ liệu filtered"""
    
    # Map sub_intent sang tên hàm backend
    endpoint_map = {
        "most_borrowed": "getTopBorrowedBooks",
        "most_viewed": "getTopViewedBooks",
        "highest_rated": "getTopRatedBooks",
        "lowest_rated": "getLowestRatedBooks",
        "newest": "getNewestBooks"
    }
    
    endpoint = endpoint_map.get(sub_intent)
    if not endpoint:
        return None
    
    try:
        url = f"{BACKEND_URL}/{endpoint}"
        print(f"📡 Calling backend: {url}")
        
        response = requests.get(url, params={"limit": limit}, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend returned {len(data)} items")
            return data
        else:
            print(f"❌ Backend error: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Backend call failed: {str(e)}")
        return None

# ===========================================
# ROUTE 1: NHẬN DATABASE TỪ BACKEND
# ===========================================
@app.route("/sendDatabaseToColab", methods=["POST"])
def receive_database():
    global database_texts, database_embeddings

    try:
        data = request.json
        records = data.get("data", [])

        if not records:
            return jsonify({
                "status": "error",
                "message": "Không có dữ liệu"
            }), 400

        print(f"📥 Nhận {len(records)} records từ backend")

        # print("\n📚 Dữ liệu nhận được từ backend:")
        # for i, record in enumerate(records, start=0):
        #   print(f"[{i}] {record}")

        database_texts = [record.strip() for record in records if record.strip()]


        # Tạo embeddings
        print("⏳ Đang tạo embeddings...")
        database_embeddings = embedding_model.encode(
            database_texts,
            convert_to_tensor=True,
            show_progress_bar=True
        )
        print(f"✅ Đã tạo {len(database_embeddings)} embeddings")
        print(f"   Shape: {database_embeddings.shape}")

        return jsonify({
            "status": "ok",
            "message": "Đã nhận và embedding thành công",
            "total_records": len(records)
        })

    except Exception as e:
        print(f"❌ Lỗi: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# ===========================================
# ROUTE 2: XỬ LÝ CHAT (RAG)
# ===========================================
@app.route("/chatbot", methods=["POST"])
def chatbot():
    global database_texts, database_embeddings

    try:
        data = request.json
        user_message = data.get("message", "").strip()

        if not user_message:
            return jsonify({
                "status": "error",
                "response": "Vui lòng nhập câu hỏi"
            }), 400

        print(f"💬 User: {user_message}")

        # ============================================
        # BƯỚC 1: PHÂN LOẠI INTENT
        # ============================================
        classification = classify_intent(user_message)
        intent = classification.get("intent")
        sub_intent = classification.get("sub_intent")
        confidence = classification.get("confidence", 0)
        
        print(f"🎯 Intent: {intent}, Sub: {sub_intent}, Confidence: {confidence}")

        # ============================================
        # BƯỚC 2: XỬ LÝ TOP_RANKING (GỌI BACKEND)
        # ============================================
        if intent == "top_ranking" and sub_intent and confidence > 0.6:
            limit = classification.get("parameters", {}).get("limit", 10)
            backend_data = call_backend_filter(sub_intent, limit)
            
            if backend_data:
                # Tạo prompt cho Gemini để format kết quả đẹp
                format_prompt = f"""Dựa vào dữ liệu sau, hãy trả lời câu hỏi "{user_message}" một cách tự nhiên:

DỮ LIỆU:
{backend_data}

YÊU CẦU FORMAT (TUÂN THỦ NGHIÊM NGẶT):
- Trả lời ngắn gọn, tự nhiên như đang chat
- Liệt kê từng cuốn sách bằng số thứ tự: 1., 2., 3.
- Mỗi cuốn sách trình bày theo format tương tự:
  Số thứ tự. Tên sách
  - Mã sách: [mã sách]
  - Tác giả: [tên tác giả]
  - Năm xuất bản: [năm]
  - [Thông tin thêm nếu có: rating/lượt mượn/lượt xem]

- TUYỆT ĐỐI KHÔNG dùng dấu ** (asterisk) để in đậm
- KHÔNG dùng dấu * ở bất kỳ đâu
- Mỗi thông tin xuống dòng bằng gạch đầu dòng -
- Thụt vào 2 khoảng trắng cho các dòng thông tin chi tiết

VÍ DỤ FORMAT ĐÚNG:
"Đây là top 3 sách mới nhất nhé:

1. Giáo Trình Vật Liệu Xây Dựng
  - Mã sách: S003
  - Tác giả: ThS. Phan Thế Vinh
  - Năm xuất bản: 2011

2. Giáo Trình Triết Học Mác - LêNin
  - Mã sách: S003
  - Tác giả: Bộ Giáo Dục Và Đào Tạo
  - Năm xuất bản: 2000

3. Giáo Trình Trắc Địa Biển
  - Mã sách: S003
  - Tác giả: TS Đinh Xuân Vinh
  - Năm xuất bản: 2003"

KHÔNG được thêm thông tin không có trong dữ liệu
Nếu thiếu thông tin rating/lượt mượn/lượt xem thì KHÔNG NÊN nhắc đến

TRẢ LỜI:"""
                
                try:
                    response = gemini_model.generate_content(format_prompt)
                    bot_response = response.text.strip()
                    print(f"✅ Bot (from backend data): {bot_response[:100]}...")
                    
                    return jsonify({
                        "status": "ok",
                        "response": bot_response,
                        "source": "backend_filter"
                    })
                except Exception as e:
                    print(f"❌ Format error: {str(e)}")
                    # Fallback xuống RAG nếu format lỗi

        # ============================================
        # BƯỚC 3: FALLBACK - RAG THUẦN (CODE CŨ)
        # ============================================
        print("🔄 Falling back to pure RAG...")
        
        # Kiểm tra database đã được load chưa
        if database_embeddings is None or len(database_texts) == 0:
            return jsonify({
                "status": "error",
                "response": "Hệ thống chưa sẵn sàng. Vui lòng đợi dữ liệu được tải lên."
            }), 503

        # === TÌM CONTEXT LIÊN QUAN ===
        print("🔍 Đang tìm kiếm context liên quan...")
        query_embedding = embedding_model.encode(user_message, convert_to_tensor=True)

        # Tính cosine similarity
        cos_scores = util.cos_sim(query_embedding, database_embeddings)[0]

        # Lấy top 5 kết quả có điểm cao nhất
        top_k = min(5, len(database_texts))
        top_results = torch.topk(cos_scores, k=top_k)

        print(f"\n{'='*80}")
        print(f"💬 CÂU HỎI: {user_message}")
        print(f"{'='*80}")
        print(f"📊 TOP {top_k} SIMILARITY SCORES:")
        for i, (score, idx) in enumerate(zip(top_results[0], top_results[1]), 1):
            print(f"\n[{i}] Score: {score:.4f}")
            print(f"    Text: {database_texts[idx][:200]}...")
        print(f"{'='*80}\n")

        relevant_contexts = []
        for score, idx in zip(top_results[0], top_results[1]):
            if score > 0.3:  # Ngưỡng similarity
                relevant_contexts.append(database_texts[idx])
                print(f"   ✓ Score {score:.3f}: {database_texts[idx][:100]}...")

        if not relevant_contexts:
            relevant_contexts = database_texts[:3]  # Fallback: lấy 3 đầu
            print("⚠️ Không tìm thấy context phù hợp, dùng fallback")

        # === BƯỚC 2: GENERATION - TẠO CÂU TRẢ LỜI ===
        context_text = "\n\n".join(relevant_contexts)

        prompt = f"""Bạn là trợ lý ảo thông minh của thư viện, nhiệm vụ trả lời câu hỏi của người dùng dựa trên thông tin có sẵn.

THÔNG TIN THƯ VIỆN:
{context_text}

CÂU HỎI: {user_message}

YÊU CẦU FORMAT:
- Trả lời ngắn gọn, rõ ràng, tự nhiên
- Chia thành các câu ngắn, mỗi ý xuống dòng (dùng \n)
- Nếu liệt kê nhiều mục, dùng số thứ tự: 1., 2., 3.
- Nếu có mục con (phân cấp), dùng:
  + Mục cha: 1., 2., 3.
  + Mục con: - (gạch đầu dòng), thụt vào 2 khoảng trắng
- KHÔNG dùng dấu * (asterisk)
- KHÔNG để dòng trống thừa giữa các mục
- Tự nhiên như đang chat, không cứng nhắc

VÍ DỤ FORMAT ĐÚNG:
"Về chức năng niên luận có mấy điểm sau:

1. Truy cập: Vào tab Thư viện → chọn Niên luận
2. Sinh viên: Chọn mục Nộp niên luận để nộp bài
3. Giảng viên có 2 mục chính:
  - Quản lý đợt nộp: tạo đợt nộp cho sinh viên
  - Danh sách niên luận: xem toàn bộ niên luận trong khoa"

KHÔNG ĐƯỢC thêm thông tin không có trong phần THÔNG TIN THƯ VIỆN
Nếu không tìm thấy thông tin: "Xin lỗi, tôi không tìm thấy thông tin về vấn đề này 😅"


TRẢ LỜI:"""

        print("🤖 Đang generate câu trả lời...")
        response = gemini_model.generate_content(prompt)
        bot_response = response.text.strip()

        print(f"✅ Bot: {bot_response[:100]}...")

        return jsonify({
            "status": "ok",
            "response": bot_response
        })

    except Exception as e:
        print(f"❌ Lỗi chatbot: {str(e)}")
        return jsonify({
            "status": "error",
            "response": "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau."
        }), 500

# ===========================================
# ROUTE 3: KIỂM TRA TRẠNG THÁI
# ===========================================
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "database_loaded": len(database_texts) > 0,
        "total_records": len(database_texts)
    })

# ===========================================
# BƯỚC 5: CHẠY SERVER
# ===========================================
if __name__ == "__main__":
    # Tạo public URL qua ngrok
    public_url = ngrok.connect(5000)
    print("\n" + "="*60)
    print("🚀 SERVER ĐANG CHẠY!")
    print("="*60)
    print(f"📡 Public URL: {public_url}")
    print("="*60)
    print("\n⚠️ LƯU Ý:")
    print("1. Copy URL trên vào file Vue của bạn")
    print("2. Thay thế: 'https://kerchieft-crescentic-lavon.ngrok-free.dev'")
    print("3. Nhớ thêm '/chatbot' vào cuối khi gọi API\n")

    # Chạy Flask
    app.run(port=5000)