from flask import Flask, request, jsonify
from flask_cors import CORS
from pyngrok import ngrok
from sentence_transformers import SentenceTransformer, util
import torch
import google.generativeai as genai
import os
import requests
import json
import re
import time


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

# ===========================================
# HÀM PHÂN LOẠI INTENT MỚI
# ===========================================
def classify_intent(user_message):
    """Phân loại câu hỏi của user bằng Gemini - CHỈ TIM_SACH_LEVEL_1"""
    prompt = f"""Bạn là AI phân loại câu hỏi về thư viện.

NHIỆM VỤ: Phân tích câu hỏi và trả về JSON format.

CÂU HỎI: "{user_message}"

DANH SÁCH INTENT:
1. "tim_sach_level_1" - Tìm sách ĐƠN GIẢN với các bộ lọc (tên, tác giả, thể loại, năm xuất bản, giá, rating, top ranking, sắp xếp...)
2. "tim_sach_level_2" - Tìm sách PHỨC TẠP với điều kiện AND/OR/NOT (ví dụ: "Sách của A HOẶC B", "Sách văn học VÀ rating cao", "KHÔNG phải giáo trình")
3. "general_info" - Thông tin chung về thư viện, quy định, giờ mở cửa...

SCHEMA CHO tim_sach_level_1:
{{
  "intent": "tim_sach_level_1",
  "filters": {{
    "TenSach": null,              // Tên sách (string hoặc null)
    "TacGia": null,               // Tác giả (string hoặc null)
    "TheLoai": null,              // Thể loại (string hoặc null)
    "NXB": null,                  // Nhà xuất bản (string hoặc null)
    "LoaiSach": null,             // "Sach" hoặc "GiaoTrinh" hoặc null
    "Khoa": null,                 // Khoa (string hoặc null)
    "MoTaSach": null,             // Mô tả sách (string hoặc null)
    "NamXuatBanMin": null,        // Năm xuất bản min (number hoặc null)
    "NamXuatBanMax": null,        // Năm xuất bản max (number hoặc null)
    "DonGiaMin": null,            // Giá sách min (number hoặc null)
    "DonGiaMax": null,            // Giá sách max (number hoặc null)
    "SoSaoMin": null,             // Số sao min (number hoặc null)
    "SoSaoMax": null              // Số sao max (number hoặc null)
  }},
  "topList": [
    // Chỉ thêm nếu user hỏi top/xếp hạng
    // {{ "field": "LuotMuon", "order": "desc", "limit": 10 }}
    // {{ "field": "LuotXem", "order": "desc", "limit": 10 }}
    // {{ "field": "DanhGia", "order": "desc", "limit": 10 }}
  ],
  "sort": {{
    "field": null,                // Field cần sort (string hoặc null)
    "order": null                 // 1=tăng dần, -1=giảm dần (number hoặc null)
  }},
  "limit": 10,                    // Giới hạn số kết quả (mặc định 10)
  "confidence": 0.9               // Độ tin cậy (0.0-1.0)
}}


VÍ DỤ tim_sach_level_2:
- "Tìm sách của tác giả Nguyễn Nhật Ánh" → filters.TacGia = "Nguyễn Nhật Ánh"
- "Top 5 sách nhiều lượt mượn nhất" → topList = [{{ "field": "LuotMuon", "order": "desc", "limit": 5 }}]
- "Sách năm 2020 đến 2023" → filters.NamXuatBanMin = 2020, filters.NamXuatBanMax = 2023
- "Giáo trình khoa Công nghệ thông tin" → filters.LoaiSach = "GiaoTrinh", filters.Khoa = "Công nghệ thông tin"
- "Sách rating cao nhất" → topList = [{{ "field": "DanhGia", "order": "desc", "limit": 10 }}]
- "Sách mới nhất" → sort = {{ "field": "createdAt", "order": -1 }}

SCHEMA CHO tim_sach_level_2:
{{
  "intent": "tim_sach_level_2",
  "query": {{
    "operator": "AND",              // "AND" | "OR" | "NOT"
    "conditions": [
      {{
        "field": "TenSach",         // Field cần filter: TenSach, TacGia, TheLoai, NXB, LoaiSach, Khoa, MoTaSach, NamXuatBan, DonGia
        "operator": "contains",     // "contains" | "equals" | "gte" | "lte" | "in"
        "value": "...",             // Giá trị cần tìm
        "negate": false             // true = NOT condition
      }}
    ],
    "subQueries": [                 // Nested queries cho điều kiện phức tạp (tùy chọn)
      {{
        "operator": "OR",
        "conditions": [...]
      }}
    ]
  }},
  "topList": [                      // Tương tự level_1
    // {{ "field": "LuotMuon", "order": "desc", "limit": 10 }}
  ],
  "sort": {{                        // Tương tự level_1
    "field": null,
    "order": null
  }},
  "limit": 10,
  "confidence": 0.9
}}

VÍ DỤ tim_sach_level_2:
- "Tìm sách của Nguyễn Nhật Ánh HOẶC Paulo Coelho"
  → {{ "operator": "OR", "conditions": [
       {{ "field": "TacGia", "operator": "contains", "value": "Nguyễn Nhật Ánh" }},
       {{ "field": "TacGia", "operator": "contains", "value": "Paulo Coelho" }}
     ] }}

- "Sách văn học năm 2020-2023 VÀ rating trên 4 sao"
  → {{ "operator": "AND", "conditions": [
       {{ "field": "TheLoai", "operator": "contains", "value": "Văn học" }},
       {{ "field": "NamXuatBan", "operator": "gte", "value": 2020 }},
       {{ "field": "NamXuatBan", "operator": "lte", "value": 2023 }},
       {{ "field": "SoSao", "operator": "gte", "value": 4 }}
     ] }}

- "Sách KHÔNG phải giáo trình VÀ có lượt mượn > 10"
  → {{ "operator": "AND", "conditions": [
       {{ "field": "LoaiSach", "operator": "equals", "value": "GiaoTrinh", "negate": true }},
       {{ "field": "LuotMuon", "operator": "gte", "value": 10 }}
     ] }}

- "(Sách của A HOẶC B) VÀ thể loại văn học"
  → {{ "operator": "AND", "conditions": [
       {{ "field": "TheLoai", "operator": "contains", "value": "Văn học" }}
     ],
     "subQueries": [
       {{ "operator": "OR", "conditions": [
            {{ "field": "TacGia", "operator": "contains", "value": "A" }},
            {{ "field": "TacGia", "operator": "contains", "value": "B" }}
          ] }}
     ] }} h

LOGIC PHÂN LOẠI (QUAN TRỌNG):
- Dùng tim_sach_level_1: Câu hỏi đơn giản, 1 điều kiện hoặc nhiều điều kiện AND cơ bản (ví dụ: "Sách văn học của A năm 2020")
- Dùng tim_sach_level_2: Câu hỏi có từ khóa "HOẶC", "OR", "KHÔNG PHẢI", "NOT", hoặc nhiều điều kiện lồng nhau phức tạp

CÁC TỪ KHÓA NHẬN DIỆN LEVEL 2:
- "hoặc", "or", "hay"
- "không phải", "not", "ngoại trừ", "trừ"
- "(... hoặc ...) và ...", "(... and ...) or ..."

OUTPUT (CHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT KHÁC):
- Nếu là câu hỏi tìm sách đơn giản: trả về schema tim_sach_level_1
- Nếu là câu hỏi tìm sách phức tạp (có OR/NOT/nested): trả về schema tim_sach_level_2
- Nếu là câu hỏi chung: {{ "intent": "general_info", "confidence": 0.9 }}

CHÚ Ý:
- Chỉ điền giá trị vào các field có thông tin trong câu hỏi
- Các field không liên quan để null
- topList chỉ thêm khi user hỏi "top", "xếp hạng", "nhiều nhất"
- confidence > 0.7 thì mới gọi API backend

BẮT ĐẦU PHÂN TÍCH:"""

    try:
        response = gemini_model.generate_content(prompt)
        text = response.text.strip()

        # Loại bỏ markdown code block
        json_text = re.sub(r'```json\n?', '', text)
        json_text = re.sub(r'```\n?', '', json_text).strip()

        classification = json.loads(json_text)
        # print(f"🎯 Classification: {json.dumps(classification, ensure_ascii=False, indent=2)}")
        return classification

    except Exception as e:
        print(f"⚠️ Intent classification error: {str(e)}")
        return {
            "intent": "general_info",
            "confidence": 0.5
        }

# ===========================================
# HÀM GỌI BACKEND TIM_SACH_LEVEL_1
# ===========================================
def call_tim_sach_level_1(classification):
    """Gọi API backend endpoint tim_sach_level_1"""
    try:
        url = f"{BACKEND_URL}/tim_sach_level_1"
        print(f"📡 Calling backend: {url}")
        print(f"📦 Payload: {json.dumps(classification, ensure_ascii=False, indent=2)}")

        response = requests.post(
            url,
            json=classification,
            headers={"Content-Type": "application/json"},
            timeout=15
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend returned {len(data) if isinstance(data, list) else 'N/A'} items")
            return data
        else:
            print(f"❌ Backend error: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        print(f"❌ Backend call failed: {str(e)}")
        return None

# ===========================================
# HÀM GỌI BACKEND TIM_SACH_LEVEL_2
# ===========================================
def call_tim_sach_level_2(classification):
    """Gọi API backend endpoint tim_sach_level_2"""
    try:
        url = f"{BACKEND_URL}/tim_sach_level_2"
        print(f"📡 Calling backend Level 2: {url}")
        print(f"📦 Payload: {json.dumps(classification, ensure_ascii=False, indent=2)}")

        response = requests.post(
            url,
            json=classification,
            headers={"Content-Type": "application/json"},
            timeout=15
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend Level 2 returned {len(data) if isinstance(data, list) else 'N/A'} items")
            return data
        else:
            print(f"❌ Backend Level 2 error: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        print(f"❌ Backend Level 2 call failed: {str(e)}")
        return None

# ===========================================
# ROUTE MỚI: SEMANTIC SEARCH (CHO BACKEND GỌI LẠI)
# ===========================================
@app.route("/semanticSearch", methods=["POST"])
def semantic_search():
    """
    Backend gọi endpoint này khi tìm exact không ra kết quả
    Payload: { "query": "text cần tìm", "field": "TenSach|TacGia|...", "candidates": [...] }
    """
    global database_embeddings, database_texts

    try:
        data = request.json
        query = data.get("query", "").strip()
        field = data.get("field", "")
        candidates = data.get("candidates", [])

        if not query:
            return jsonify({
                "status": "error",
                "message": "Missing query parameter"
            }), 400

        print(f"🔍 Semantic search: query='{query}', field='{field}', candidates={len(candidates)}")

        # Nếu có candidates từ backend
        if candidates:
            candidate_texts = [str(c) for c in candidates]
        else:
            # Fallback: tìm trong toàn bộ database_texts
            candidate_texts = database_texts

        if not candidate_texts:
            return jsonify({
                "status": "error",
                "message": "No candidates to search"
            }), 400

        # Encode query và candidates
        query_embedding = embedding_model.encode(query, convert_to_tensor=True)
        candidate_embeddings = embedding_model.encode(candidate_texts, convert_to_tensor=True)

        # Tính cosine similarity
        cos_scores = util.cos_sim(query_embedding, candidate_embeddings)[0]

        # Lấy top 5 kết quả
        top_k = min(5, len(candidate_texts))
        top_results = torch.topk(cos_scores, k=top_k)

        results = []
        for score, idx in zip(top_results[0], top_results[1]):
            if score > 0.3:  # Ngưỡng similarity
                results.append({
                    "text": candidate_texts[idx],
                    "score": float(score)
                })

        print(f"✅ Found {len(results)} semantic matches")

        return jsonify({
            "status": "ok",
            "results": results
        })

    except Exception as e:
        print(f"❌ Semantic search error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

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
    start_time = time.time()  # BẮT ĐẦU ĐO THỜI GIAN

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
        confidence = classification.get("confidence", 0)

        print(f"🎯 Intent: {intent}, Confidence: {confidence}")

        # ============================================
        # BƯỚC 2: XỬ LÝ TIM_SACH_LEVEL_1 (GỌI BACKEND)
        # ============================================
        if intent == "tim_sach_level_1" and confidence > 0.7:
            backend_data = call_tim_sach_level_1(classification)

            if backend_data:
                # Kiểm tra xem có phải weighted scoring không
                topList = classification.get("topList", [])
                is_weighted_scoring = topList and len(topList) > 1
                
                # Tạo prompt cho Gemini để format kết quả đẹp
                format_prompt = f"""Dựa vào dữ liệu sau, hãy trả lời câu hỏi "{user_message}" một cách tự nhiên:

DỮ LIỆU:
{json.dumps(backend_data, ensure_ascii=False, indent=2)}

{"⚠️ LƯU Ý QUAN TRỌNG: Đây là kết quả TỔNG HỢP (weighted scoring) dựa trên NHIỀU tiêu chí cùng lúc. KHÔNG tách thành các danh sách riêng biệt." if is_weighted_scoring else ""}

YÊU CẦU FORMAT (TUÂN THỦ NGHIÊM NGẶT):
- Trả lời ngắn gọn, tự nhiên như đang chat
{"- Nếu có nhiều tiêu chí (lượt mượn + lượt xem + rating): ĐÂY LÀ XẾP HẠNG TỔNG HỢP, chỉ liệt kê 1 DANH SÁCH duy nhất" if is_weighted_scoring else ""}
- Liệt kê từng cuốn sách bằng số thứ tự: 1., 2., 3.
- Mỗi cuốn sách trình bày theo format:
  Số thứ tự. Tên sách
  - Mã sách: [mã sách]
  - Tác giả: [tên tác giả]
  - Năm xuất bản: [năm]
  - [Thông tin thêm: Nếu có LuotMuon + LuotXem thì PHẢI GHI CẢ 2, nếu có DanhGia thì ghi cả rating]

- TUYỆT ĐỐI KHÔNG dùng dấu ** (asterisk) để in đậm
- KHÔNG dùng dấu * ở bất kỳ đâu
- Mỗi thông tin xuống dòng bằng gạch đầu dòng -
- Thụt vào 2 khoảng trắng cho các dòng thông tin chi tiết

VÍ DỤ FORMAT ĐÚNG (KHI CÓ NHIỀU TIÊU CHÍ):
"Đây là top 3 sách có lượt mượn và lượt xem cao nhất (xếp hạng tổng hợp):

1. Mắt Biếc
  - Mã sách: S0003
  - Tác giả: Nguyễn Nhật Ánh
  - Năm xuất bản: 1990
  - Lượt mượn: 15
  - Lượt xem: 195

2. Ngồi Khóc Trên Cây
  - Mã sách: S0008
  - Tác giả: Nguyễn Nhật Ánh
  - Năm xuất bản: 2013
  - Lượt mượn: 13
  - Lượt xem: 154

3. 1984
  - Mã sách: S0006
  - Tác giả: George Orwell
  - Năm xuất bản: 1949
  - Lượt mượn: 17
  - Lượt xem: 142"

❌ TUYỆT ĐỐI KHÔNG TÁCH THÀNH:
"Top 3 sách mượn nhiều nhất:
1. ...
2. ...

Top 3 sách xem nhiều nhất:
1. ...
2. ..."

KHÔNG được thêm thông tin không có trong dữ liệu

TRẢ LỜI:"""

                try:
                    response = gemini_model.generate_content(format_prompt)
                    bot_response = response.text.strip()
                    print(f"✅ Bot (from tim_sach_level_1): {bot_response[:100]}...")

                    # Chèn đo thời gian ở đây
                    end_time = time.time()
                    print(f"⏱️ Thời gian thực hiện tim_sach_level_1: {end_time - start_time:.3f} giây")

                    return jsonify({
                        "status": "ok",
                        "response": bot_response,
                        "source": "tim_sach_level_1"
                    })
                except Exception as e:
                    print(f"❌ Format error: {str(e)}")
                    # Fallback xuống RAG nếu format lỗi
        # BƯỚC 2.5: XỬ LÝ TIM_SACH_LEVEL_2 (GỌI BACKEND)
        # ============================================
        elif intent == "tim_sach_level_2" and confidence > 0.7:
            backend_data = call_tim_sach_level_2(classification)

            if backend_data:
                # Kiểm tra xem có phải weighted scoring không
                topList = classification.get("topList", [])
                is_weighted_scoring = topList and len(topList) > 1
                
                # Tạo prompt cho Gemini để format kết quả đẹp
                format_prompt = f"""Dựa vào dữ liệu sau, hãy trả lời câu hỏi "{user_message}" một cách tự nhiên:

DỮ LIỆU:
{json.dumps(backend_data, ensure_ascii=False, indent=2)}

{"⚠️ LƯU Ý QUAN TRỌNG: Đây là kết quả TỔNG HỢP (weighted scoring) dựa trên NHIỀU tiêu chí cùng lúc. KHÔNG tách thành các danh sách riêng biệt." if is_weighted_scoring else ""}

YÊU CẦU FORMAT (TUÂN THỦ NGHIÊM NGẶT):
- Trả lời ngắn gọn, tự nhiên như đang chat
{"- Nếu có nhiều tiêu chí (lượt mượn + lượt xem + rating): ĐÂY LÀ XẾP HẠNG TỔNG HỢP, chỉ liệt kê 1 DANH SÁCH duy nhất" if is_weighted_scoring else ""}
- Liệt kê từng cuốn sách bằng số thứ tự: 1., 2., 3.
- Mỗi cuốn sách trình bày theo format:
  Số thứ tự. Tên sách
  - Mã sách: [mã sách]
  - Tác giả: [tên tác giả]
  - Năm xuất bản: [năm]
  - [Thông tin thêm nếu có: rating/lượt mượn/lượt xem/giá]

- TUYỆT ĐỐI KHÔNG dùng dấu ** (asterisk) để in đậm
- KHÔNG dùng dấu * ở bất kỳ đâu
- Mỗi thông tin xuống dòng bằng gạch đầu dòng -
- Thụt vào 2 khoảng trắng cho các dòng thông tin chi tiết

VÍ DỤ FORMAT ĐÚNG:
"Đây là các cuốn sách bạn cần tìm:

1. Mắt Biếc
  - Mã sách: S0003
  - Tác giả: Nguyễn Nhật Ánh
  - Năm xuất bản: 1990
  - Lượt mượn: 15
  - Lượt xem: 195

2. Nhà Giả Kim
  - Mã sách: S0012
  - Tác giả: Paulo Coelho
  - Năm xuất bản: 1988
  - Lượt mượn: 8
  - Lượt xem: 120"

KHÔNG được thêm thông tin không có trong dữ liệu

TRẢ LỜI:"""

                try:
                    response = gemini_model.generate_content(format_prompt)
                    bot_response = response.text.strip()
                    print(f"✅ Bot (from tim_sach_level_2): {bot_response[:100]}...")

                    # Chèn đo thời gian ở đây
                    end_time = time.time()
                    print(f"⏱️ Thời gian thực hiện tim_sach_level_2: {end_time - start_time:.3f} giây")

                    return jsonify({
                        "status": "ok",
                        "response": bot_response,
                        "source": "tim_sach_level_2"
                    })
                except Exception as e:
                    print(f"❌ Format error Level 2: {str(e)}")
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

        # === GENERATION - TẠO CÂU TRẢ LỜI ===
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

KHÔNG ĐƯỢC thêm thông tin không có trong phần THÔNG TIN THƯ VIỆN
Nếu không tìm thấy thông tin: "Xin lỗi, tôi không tìm thấy thông tin về vấn đề này 😅"

TRẢ LỜI:"""

        print("🤖 Đang generate câu trả lời...")
        response = gemini_model.generate_content(prompt)
        bot_response = response.text.strip()

        print(f"✅ Bot: {bot_response[:100]}...")

        return jsonify({
            "status": "ok",
            "response": bot_response,
            "source": "pure_rag"
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
    print("3. Nhớ thêm '/chatbot' hoặc '/semanticSearch' vào cuối khi gọi API\n")

    # Chạy Flask
    app.run(port=5000)