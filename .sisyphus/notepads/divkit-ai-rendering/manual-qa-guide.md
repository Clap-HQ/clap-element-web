# DivKit AI 메시지 렌더링 - 수동 QA 가이드

## 사전 준비

### 1. 개발 서버 시작
```bash
yarn start
```
- 브라우저에서 http://localhost:8080 접속
- Clap 계정으로 로그인 (dev.clap.ac 또는 clap.ac)

### 2. AI 채팅방 생성
- 좌측 패널에서 "+" 버튼 클릭
- "New chat" 선택
- AI 봇과 대화 시작

---

## QA 체크리스트

### ✅ Test 1: DivKit 카드 렌더링 확인

**목적**: AI 메시지에서 DivKit 카드가 올바르게 렌더링되는지 확인

**단계**:
1. AI 봇에게 DivKit 카드가 포함된 메시지 요청
2. 메시지가 타임라인에 표시되는지 확인
3. 카드 내용이 올바르게 렌더링되는지 확인

**예상 결과**:
- [ ] 메시지가 `.mx_DivKitBody` 컴포넌트로 렌더링됨
- [ ] 카드 내용 (텍스트, 버튼 등)이 표시됨
- [ ] 레이아웃이 깨지지 않음

**확인 방법**:
- 개발자 도구 (F12) 열기
- Elements 탭에서 `.mx_DivKitBody` 클래스 검색
- 해당 요소가 존재하고 내용이 렌더링되었는지 확인

---

### ✅ Test 2: DivKit 카드 없는 메시지 → TextualBody 렌더링

**목적**: DivKit 카드가 없는 일반 메시지는 기존처럼 TextualBody로 렌더링되는지 확인

**단계**:
1. AI 봇에게 일반 텍스트 메시지 전송
2. 메시지가 타임라인에 표시되는지 확인

**예상 결과**:
- [ ] 메시지가 `.mx_EventTile_body` 컴포넌트로 렌더링됨
- [ ] `.mx_DivKitBody` 클래스가 없음
- [ ] 일반 텍스트로 표시됨

**확인 방법**:
- 개발자 도구에서 메시지 요소 검사
- `.mx_DivKitBody` 클래스가 없는지 확인
- `.mx_EventTile_body` 클래스가 있는지 확인

---

### ✅ Test 3: Light 테마 색상 적용

**목적**: Light 테마에서 palette.light 색상이 적용되는지 확인

**단계**:
1. Settings → Appearance → Theme 선택
2. "Light" 테마 선택
3. AI 채팅방으로 돌아가기
4. DivKit 카드 메시지 확인

**예상 결과**:
- [ ] 카드 배경색이 밝은 색상 (#FFFFFF 등)
- [ ] 텍스트 색상이 어두운 색상 (#000000 등)
- [ ] palette.light 색상이 적용됨

**확인 방법**:
- 개발자 도구에서 DivKit 카드 요소 검사
- Computed 탭에서 background-color, color 확인
- palette.light에 정의된 색상과 일치하는지 확인

---

### ✅ Test 4: Dark 테마 색상 적용

**목적**: Dark 테마에서 palette.dark 색상이 적용되는지 확인

**단계**:
1. Settings → Appearance → Theme 선택
2. "Dark" 테마 선택
3. AI 채팅방으로 돌아가기
4. DivKit 카드 메시지 확인

**예상 결과**:
- [ ] 카드 배경색이 어두운 색상 (#1A1A1A 등)
- [ ] 텍스트 색상이 밝은 색상 (#FFFFFF 등)
- [ ] palette.dark 색상이 적용됨

**확인 방법**:
- 개발자 도구에서 DivKit 카드 요소 검사
- Computed 탭에서 background-color, color 확인
- palette.dark에 정의된 색상과 일치하는지 확인

---

### ✅ Test 5: 테마 변경 시 즉시 색상 업데이트

**목적**: 테마를 변경하면 DivKit 카드가 즉시 재렌더링되어 새 색상이 적용되는지 확인

**단계**:
1. Light 테마에서 DivKit 카드 메시지 확인
2. Settings → Appearance → Theme → "Dark" 선택
3. AI 채팅방으로 돌아가기 (페이지 새로고침 없이)
4. 동일한 DivKit 카드 메시지 확인

**예상 결과**:
- [ ] 페이지 새로고침 없이 색상이 즉시 변경됨
- [ ] Light → Dark 전환 시 어두운 색상으로 변경
- [ ] Dark → Light 전환 시 밝은 색상으로 변경

**확인 방법**:
- 테마 변경 전후 스크린샷 비교
- 개발자 도구 Console에서 에러 없는지 확인
- 카드가 깜빡이거나 깨지지 않는지 확인

---

### ✅ Test 6: 버튼 클릭 → 메시지 전송

**목적**: DivKit 카드의 버튼을 클릭하면 해당 버튼 텍스트가 메시지로 전송되는지 확인

**단계**:
1. DivKit 카드에서 버튼 (예: "승인", "거부") 클릭
2. 타임라인에 새 메시지가 추가되는지 확인
3. 메시지 내용이 버튼 텍스트와 일치하는지 확인

**예상 결과**:
- [ ] 버튼 클릭 시 새 메시지가 타임라인에 추가됨
- [ ] 메시지 body가 버튼 텍스트 (예: "승인")
- [ ] 메시지에 `ac.clap.action` 필드 포함

**확인 방법**:
- 개발자 도구 Network 탭에서 `/_matrix/client/v3/rooms/.../send/m.room.message` 요청 확인
- Request Payload에서 다음 확인:
  ```json
  {
    "msgtype": "m.text",
    "body": "승인",
    "ac.clap.action": {
      "url": "clap://action/approve",
      "log_id": "approve_001"
    }
  }
  ```

---

## 테스트 데이터

### DivKit 카드 메시지 예시

AI 봇에게 다음과 같은 메시지를 요청하거나, 개발자 도구 Console에서 직접 전송:

```javascript
// Console에서 실행 (Matrix client 필요)
const roomId = "!your-room-id:clap.ac";
const content = {
  msgtype: "m.text",
  body: "Fallback text",
  "ac.clap.ai": {
    card: {
      log_id: "test_card",
      states: [
        {
          state_id: 0,
          div: {
            type: "container",
            items: [
              {
                type: "text",
                text: "테스트 DivKit 카드",
              },
              {
                type: "container",
                orientation: "horizontal",
                items: [
                  {
                    type: "text",
                    text: "승인",
                    actions: [
                      {
                        log_id: "approve",
                        url: "clap://action/approve",
                      },
                    ],
                  },
                  {
                    type: "text",
                    text: "거부",
                    actions: [
                      {
                        log_id: "reject",
                        url: "clap://action/reject",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    palette: {
      light: [
        { name: "clap.bg.primary", color: "#FFFFFF" },
        { name: "clap.text.primary", color: "#000000" },
      ],
      dark: [
        { name: "clap.bg.primary", color: "#1A1A1A" },
        { name: "clap.text.primary", color: "#FFFFFF" },
      ],
    },
    message_type: "test",
    version: "1.0",
  },
};

// Matrix client로 메시지 전송
window.mxMatrixClientPeg.get().sendEvent(roomId, "m.room.message", content);
```

---

## 문제 발생 시

### DivKit 카드가 렌더링되지 않음
1. 개발자 도구 Console에서 에러 확인
2. Network 탭에서 DivKit CSS 로드 확인 (`client.css`)
3. Elements 탭에서 `.mx_DivKitBody` 요소 존재 확인

### 버튼 클릭이 작동하지 않음
1. Console에서 `onCustomAction` 콜백 호출 확인
2. Network 탭에서 메시지 전송 요청 확인
3. `handleClapAction` 함수 로그 확인

### 테마 색상이 적용되지 않음
1. Console에서 `getPaletteVariables` 호출 확인
2. DivKit globalVariablesController 변수 등록 확인
3. palette 데이터가 올바른지 확인

---

## QA 완료 후

모든 테스트가 통과하면 `.sisyphus/plans/divkit-ai-rendering.md` 파일의 체크박스를 업데이트하고 커밋:

```bash
# Plan 파일 체크박스 업데이트
# - [ ] → - [x]

git add .sisyphus/plans/divkit-ai-rendering.md
git commit -m "chore(qa): complete manual QA for DivKit AI message rendering"
```
