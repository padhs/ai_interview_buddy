# Postman Testing Guide for Gemini API and ElevenLabs API

This guide shows you how to test the Gemini and ElevenLabs API integrations through your localhost backend.

## Prerequisites

1. **Backend must be running** on `http://localhost:8080` (or check your docker-compose/backend config)
2. **Environment variables must be set:**
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `ELEVENLABS_API_KEY` - Your ElevenLabs API key
   - `ELEVENLABS_VOICE_ID` (optional, defaults to "Eric")

## Testing Gemini API

### Test 1: Vision Observe Endpoint (Gemini + ElevenLabs)

**Endpoint:** `POST http://localhost:8080/api/v1/vision/observe`

**Description:** This endpoint uses Gemini to analyze a screenshot and generate interview feedback, then converts it to speech via ElevenLabs.

**Request Configuration:**

1. **Method:** POST
2. **URL:** `http://localhost:8080/api/v1/vision/observe`
3. **Headers:**
   ```
   Content-Type: application/json
   ```
4. **Body (raw JSON):**
   ```json
   {
     "interview_id": "test-interview-123",
     "session_id": "test-session-456",
     "screenshot": {
       "mime": "image/webp",
       "data": "YOUR_BASE64_IMAGE_DATA_HERE"
     },
     "ui_state": {
       "session_id": "test-session-456",
       "problem_id": 1,
       "language": "python",
       "last_run_status": "accepted",
       "failing_test_cases": [],
       "diff_hash": "abc123"
     }
   }
   ```

**How to get Base64 image data:**
1. Use any image (PNG/JPG)
2. In Postman, you can use the following in "Pre-request Script":
   ```javascript
   // For testing, use a simple 1x1 pixel PNG in base64
   const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
   pm.environment.set("testImageBase64", base64Image);
   ```
3. Then use `{{testImageBase64}}` in your JSON body

**Expected Response (200 OK):**
```json
{
  "status_code": 200,
  "message": "success",
  "display_text": "The interviewer's response text here",
  "reason": "Why the interviewer said this",
  "audio_b64": "BASE64_ENCODED_AUDIO_MP3"
}
```

**Common Errors:**
- **502 Bad Gateway** - Check if `GEMINI_API_KEY` or `ELEVENLABS_API_KEY` is set in your backend environment
- **400 Bad Request** - Missing required fields or invalid base64 image data

---

## Testing Voice Chat Endpoint (Gemini STT + Processing + ElevenLabs TTS)

**Endpoint:** `POST http://localhost:8080/api/v1/voice/chat`

**Description:** This endpoint accepts audio, sends it to Gemini for transcription and processing, then converts the response to speech via ElevenLabs.

**Request Configuration:**

1. **Method:** POST
2. **URL:** `http://localhost:8080/api/v1/voice/chat`
3. **Headers:** Postman will set this automatically for multipart/form-data
4. **Body (form-data):**
   - Key: `audio` (File)
     - Value: Upload an audio file (`.webm`, `.mp3`, `.wav`, etc.)
     - Type: File
   - Key: `context` (Text, optional)
     - Value:
     ```json
     {
       "session_id": "test-session-456",
       "problem_id": 1,
       "language": "python",
       "last_run_status": "accepted",
       "failing_test_cases": [],
       "diff_hash": "abc123"
     }
     ```
   - Key: `screenshot` (Text, optional)
     - Value: Base64 encoded image string (same as above)

**Expected Response:**
- **Content-Type:** `audio/mpeg`
- **Body:** Binary audio file (MP3)
- You can download/save this as an MP3 file and play it

**Common Errors:**
- **502 Bad Gateway** - API keys missing or invalid
- **400 Bad Request** - Missing audio file or invalid format

---

## Testing ElevenLabs TTS Directly

**Endpoint:** `POST http://localhost:8080/api/v1/voice/tts`

**Description:** Direct TTS proxy to ElevenLabs (bypasses Gemini).

**Request Configuration:**

1. **Method:** POST
2. **URL:** `http://localhost:8080/api/v1/voice/tts`
3. **Headers:**
   ```
   Content-Type: application/json
   ```
4. **Body (raw JSON):**
   ```json
   {
     "text": "Hello, this is a test of the ElevenLabs text to speech service.",
     "model_id": "eleven_multilingual_v2"
   }
   ```

**Expected Response:**
- **Content-Type:** `audio/mpeg`
- **Body:** Binary audio file (MP3)

---

## Quick Test Scripts for Postman

### Pre-request Script for Vision Observe Test:

```javascript
// Generate a simple test image base64 (1x1 red pixel PNG)
const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
pm.environment.set("testImageBase64", base64Image);

// Set test data
pm.environment.set("testInterviewId", "test-interview-" + Date.now());
pm.environment.set("testSessionId", "test-session-" + Date.now());
```

### Test Script for Vision Observe (to verify response):

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has display_text", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('display_text');
    pm.expect(jsonData.display_text).to.be.a('string');
});

pm.test("Response has audio_b64", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('audio_b64');
    pm.expect(jsonData.audio_b64).to.be.a('string');
    console.log("Audio base64 length:", jsonData.audio_b64.length);
});
```

---

## Troubleshooting

### Backend not responding:
- Check if backend is running: `docker-compose ps` or check backend logs
- Verify backend is listening on the correct port (usually 8080)

### 502 Bad Gateway:
1. **Check environment variables:**
   ```bash
   # In your backend container or environment
   echo $GEMINI_API_KEY
   echo $ELEVENLABS_API_KEY
   ```

2. **Check backend logs:**
   ```bash
   docker-compose logs backend
   # or if running directly
   # Check your backend console output
   ```

3. **Test API keys directly:**
   - Gemini: Visit https://ai.google.dev/ to verify your API key
   - ElevenLabs: Visit https://elevenlabs.io/app/ to verify your API key

### Invalid image/screenshot:
- Make sure base64 string doesn't include `data:image/webp;base64,` prefix
- Image must be valid base64 and decode properly
- Image size must be less than 1MB after decoding

### Audio file issues:
- Supported formats: `.webm`, `.mp3`, `.wav`, etc.
- File size should be reasonable (backend limit: 25MB)

---

## Example Postman Collection JSON

You can import this into Postman:

```json
{
  "info": {
    "name": "AI Interview Buddy API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Vision Observe (Gemini + ElevenLabs)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"interview_id\": \"{{testInterviewId}}\",\n  \"session_id\": \"{{testSessionId}}\",\n  \"screenshot\": {\n    \"mime\": \"image/webp\",\n    \"data\": \"{{testImageBase64}}\"\n  },\n  \"ui_state\": {\n    \"session_id\": \"{{testSessionId}}\",\n    \"problem_id\": 1,\n    \"language\": \"python\",\n    \"last_run_status\": \"accepted\",\n    \"failing_test_cases\": [],\n    \"diff_hash\": \"abc123\"\n  }\n}"
        },
        "url": {
          "raw": "http://localhost:8080/api/v1/vision/observe",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8080",
          "path": ["api", "v1", "vision", "observe"]
        }
      }
    },
    {
      "name": "Voice Chat (Gemini STT + ElevenLabs TTS)",
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "audio",
              "type": "file",
              "src": []
            },
            {
              "key": "context",
              "value": "{\n  \"session_id\": \"test-session\",\n  \"problem_id\": 1,\n  \"language\": \"python\",\n  \"last_run_status\": \"accepted\",\n  \"failing_test_cases\": []\n}",
              "type": "text"
            }
          ]
        },
        "url": {
          "raw": "http://localhost:8080/api/v1/voice/chat",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8080",
          "path": ["api", "v1", "voice", "chat"]
        }
      }
    }
  ]
}
```

---

## Notes

- **Port:** Default backend port is `8080`. Adjust if your setup uses a different port.
- **CORS:** Backend allows `localhost:3000` (frontend), but Postman bypasses CORS.
- **Rate Limiting:** Be mindful of API rate limits for Gemini and ElevenLabs.
- **Image Size:** Screenshots are limited to 1MB after base64 decoding.
- **Audio Format:** Voice chat expects `audio/webm` by default, but accepts other formats.

