# DivKit 기반 Clap AI 응답 렌더링

## Context

### Original Request

Clap AI의 응답 메시지에서 `content.ac.clap.ai.card`에 내려오는 DivKit JSON을 기반으로 UI를 렌더링하는 기능 구현. 버튼 클릭 시 해당 버튼의 label text를 메시지로 전송.

### Interview Summary

**Key Discussions**:

- 렌더링 위치: 모든 위치 (ClapAIChatCard, 메인 타임라인, 어디서든)
- 액션 처리: 버튼 클릭 → 버튼의 `text` (label)를 room에 메시지로 전송
- 테마 변수: `content.ac.clap.ai.palette`에서 light/dark 색상 참조
- Fallback: `ac.clap.ai.card`가 없으면 기존 TextualBody 유지
- 테스트: 구현 후 테스트

**Research Findings**:

- DivKit 패키지: `@divkitframework/divkit` (client 모듈, 82.8KB minified+brotli)
- React 19와 호환성 검증 필요 (DOM 직접 조작 방식)
- `useTheme()` 훅 존재 → `{ theme: "light"|"dark"|..., systemThemeActivated }`
- MessageEvent는 `overrideBodyTypes` prop으로 확장 가능

### Metis Review

**Identified Gaps** (addressed):

- DivKit + React 19 호환성 → 설치 후 즉시 기본 렌더링 테스트로 검증
- 버튼 label 위치 → JSON 구조상 `text` 필드에서 가져옴 (예시에서 확인됨)
- Edge cases (빈 palette, 잘못된 JSON) → Error Boundary + fallback 처리

---

## Work Objectives

### Core Objective

Matrix 이벤트의 `ac.clap.ai.card` DivKit JSON을 렌더링하고, 버튼 클릭 시 해당 버튼의 label을 메시지로 전송하는 기능 구현.

### Concrete Deliverables

- `@divkitframework/divkit` 패키지 설치
- `src/components/views/messages/DivKitBody.tsx` - DivKit 렌더링 컴포넌트
- `src/utils/ClapAIDivKit.ts` - 변수 매핑 및 액션 처리 유틸리티
- `src/components/views/messages/MessageEvent.tsx` 수정 - 라우팅 로직 추가
- `test/components/views/messages/DivKitBody-test.tsx` - 단위 테스트

### Definition of Done

- [ ] DivKit 카드가 있는 AI 메시지가 올바르게 렌더링됨 (수동 QA 필요)
- [ ] 테마 변경 시 색상이 즉시 업데이트됨 (수동 QA 필요)
- [ ] 버튼 클릭 시 해당 버튼 텍스트가 메시지로 전송됨 (수동 QA 필요)
- [ ] DivKit 카드가 없는 메시지는 기존처럼 TextualBody로 렌더링됨 (수동 QA 필요)
- [x] `yarn lint:types` 통과
- [x] `yarn test` 통과

### Must Have

- DivKit JSON 렌더링
- palette 기반 테마 변수 매핑
- 버튼 클릭 → 메시지 전송
- Error Boundary로 렌더링 실패 처리

### Must NOT Have (Guardrails)

- DivKit 애니메이션/전환 효과 (Phase 1 범위 외)
- `clap://` 외 다른 커스텀 프로토콜 처리
- DivKit 커스텀 컴포넌트 등록
- DivKit 카드 편집 기능
- MessageEvent.tsx의 기존 라우팅 로직 수정 (추가만)
- 전역 CSS 추가 (Tailwind 또는 mx\_ 스코프 필수)
- `any` 타입 사용 (strict TypeScript)

---

## Verification Strategy (MANDATORY)

### Test Decision

- **Infrastructure exists**: YES (Jest + React Testing Library)
- **User wants tests**: YES (구현 후 테스트)
- **Framework**: Jest + @testing-library/react

### Manual Execution Verification

각 TODO 완료 후 브라우저에서 직접 확인:

1. AI와 대화하여 DivKit 카드가 포함된 메시지 수신
2. 카드가 올바르게 렌더링되는지 확인
3. 테마 변경 (Settings → Appearance) 후 색상 변경 확인
4. 버튼 클릭 후 메시지 전송 확인

---

## Task Flow

```
Task 0 (패키지 설치)
    ↓
Task 1 (유틸리티)
    ↓
Task 2 (DivKitBody 컴포넌트)
    ↓
Task 3 (MessageEvent 라우팅)
    ↓
Task 4 (액션 처리)
    ↓
Task 5 (Error Boundary)
    ↓
Task 6 (테스트)
    ↓
Task 7 (통합 검증)
```

## Parallelization

| Task | Depends On | Reason                   |
| ---- | ---------- | ------------------------ |
| 0    | -          | 첫 번째 작업             |
| 1    | 0          | DivKit 타입 필요         |
| 2    | 1          | 유틸리티 함수 필요       |
| 3    | 2          | DivKitBody 컴포넌트 필요 |
| 4    | 2          | DivKitBody에 통합        |
| 5    | 2          | DivKitBody 감싸기        |
| 6    | 3, 4, 5    | 모든 기능 완료 후        |
| 7    | 6          | 테스트 통과 후           |

---

## TODOs

- [x]   0. DivKit 패키지 설치 및 CSS 통합

    **What to do**:
    - `yarn add @divkitframework/divkit` 실행
    - CSS import 위치 결정 (전역 또는 컴포넌트 레벨)
    - React 19 호환성 기본 테스트 (콘솔에서 간단한 render 호출)

    **Must NOT do**:
    - 다른 DivKit 관련 패키지 설치 (react 래퍼 등)

    **Parallelizable**: NO (첫 번째 작업)

    **References**:

    **Pattern References**:
    - `package.json` - 의존성 추가 위치

    **External References**:
    - DivKit README: https://github.com/divkit/divkit/blob/main/client/web/divkit/README.md
    - 설치 명령: `npm i @divkitframework/divkit --save`

    **Acceptance Criteria**:
    - [ ] `yarn add @divkitframework/divkit` 성공
    - [ ] `node_modules/@divkitframework/divkit` 디렉토리 존재
    - [ ] `import { render } from '@divkitframework/divkit/client'` 타입 에러 없음

    **Commit**: YES
    - Message: `chore(deps): add @divkitframework/divkit for AI message rendering`
    - Files: `package.json`, `yarn.lock`

---

- [x]   1. ClapAIDivKit 유틸리티 생성

    **What to do**:
    - `src/utils/ClapAIDivKit.ts` 파일 생성
    - 타입 정의: `ClapAIContent`, `ClapAIPalette`, `ClapAICardVariables`
    - 함수: `extractDivKitCard(content)` - ac.clap.ai.card 추출
    - 함수: `getPaletteVariables(palette, theme)` - palette를 DivKit 변수로 변환
    - 함수: `getCardVariables(card)` - card.variables를 DivKit 변수로 변환

    **Must NOT do**:
    - 액션 처리 로직 (Task 4에서 구현)
    - React 훅 사용 (순수 유틸리티만)

    **Parallelizable**: NO (Task 0 완료 필요)

    **References**:

    **Pattern References**:
    - `src/utils/MediaEventHelper.ts` - 유틸리티 클래스 패턴 참조
    - `src/utils/EventUtils.ts:45-78` - 이벤트 컨텐츠 추출 패턴

    **Type References**:
    - Matrix 이벤트 구조 (사용자 제공 JSON 기반):
        ```typescript
        interface ClapAIContent {
            "ac.clap.ai"?: {
                card?: DivKitCard;
                palette?: ClapAIPalette;
                message_type?: string;
                version?: string;
            };
            "body": string;
            "msgtype": string;
        }
        ```

    **External References**:
    - DivKit 변수 API: `createVariable(name, type, value)`
    - 지원 타입: `'string' | 'number' | 'integer' | 'boolean' | 'color' | 'url' | 'dict' | 'array'`

    **Acceptance Criteria**:
    - [ ] `extractDivKitCard(content)`가 card 객체 반환 (없으면 null)
    - [ ] `getPaletteVariables(palette, "light")`가 light 색상 변수 배열 반환
    - [ ] `getPaletteVariables(palette, "dark")`가 dark 색상 변수 배열 반환
    - [ ] `getCardVariables(card)`가 card.variables를 DivKit Variable 배열로 변환
    - [ ] `yarn lint:types` 통과

    **Commit**: YES
    - Message: `feat(ai): add ClapAIDivKit utility for DivKit variable mapping`
    - Files: `src/utils/ClapAIDivKit.ts`

---

- [x]   2. DivKitBody 컴포넌트 구현

    **What to do**:
    - `src/components/views/messages/DivKitBody.tsx` 파일 생성
    - IBodyProps 인터페이스 구현 (ref 전달 포함)
    - useTheme() 훅으로 현재 테마 감지
    - useRef로 DOM 컨테이너 참조
    - useEffect에서 DivKit render() 호출
    - useEffect cleanup에서 DivKit 리소스 정리
    - CSS import: `@divkitframework/divkit/dist/client.css`

    **Must NOT do**:
    - 액션 처리 로직 (Task 4에서 추가)
    - Error Boundary (Task 5에서 추가)

    **Parallelizable**: NO (Task 1 완료 필요)

    **References**:

    **Pattern References**:
    - `src/components/views/messages/TextualBody.tsx:41-88` - Body 컴포넌트 구조
    - `src/components/views/messages/IBodyProps.ts` - 인터페이스 정의
    - `src/hooks/useTheme.ts` - 테마 감지 패턴

    **API References**:
    - DivKit render():
        ```typescript
        render({
          id: string,           // 고유 ID (이벤트 ID 사용)
          target: HTMLElement,  // 렌더링 대상
          json: { card, templates? },
          globalVariablesController: controller,
          onError: (details) => void,
          onCustomAction: (action) => void  // Task 4에서 추가
        })
        ```

    **Acceptance Criteria**:
    - [ ] 컴포넌트가 IBodyProps 인터페이스 구현
    - [ ] useTheme()로 테마 감지하여 palette 선택
    - [ ] DivKit render() 호출하여 카드 렌더링
    - [ ] 테마 변경 시 re-render (useEffect deps에 theme 포함)
    - [ ] 컴포넌트 unmount 시 cleanup 수행
    - [ ] `yarn lint:types` 통과

    **Manual Verification**:
    - [ ] 개발 서버에서 DivKit 카드 메시지 확인 (아직 라우팅 안 됨, 직접 import해서 테스트)

    **Commit**: YES
    - Message: `feat(ai): add DivKitBody component for rendering AI cards`
    - Files: `src/components/views/messages/DivKitBody.tsx`

---

- [x]   3. MessageEvent 라우팅 연결

    **What to do**:
    - `src/components/views/messages/MessageEvent.tsx` 수정
    - render()에서 `ac.clap.ai.card` 존재 여부 확인
    - 존재하면 DivKitBody 렌더링, 없으면 기존 로직 유지
    - import 추가: `DivKitBody`

    **Must NOT do**:
    - 기존 bodyTypes/evTypes 맵 수정
    - 기존 라우팅 로직 변경 (추가만)

    **Parallelizable**: NO (Task 2 완료 필요)

    **References**:

    **Pattern References**:
    - `src/components/views/messages/MessageEvent.tsx:243-275` - render() 메서드
    - `src/components/views/messages/MessageEvent.tsx:247-262` - BodyType 결정 로직

    **Integration Point**:
    - 기존 코드의 BodyType 결정 후, ac.clap.ai.card가 있으면 DivKitBody로 오버라이드
    - 위치: `if (!this.props.mxEvent.isRedacted())` 블록 내부

    **Acceptance Criteria**:
    - [ ] `ac.clap.ai.card`가 있는 메시지 → DivKitBody 렌더링
    - [ ] `ac.clap.ai.card`가 없는 메시지 → 기존 TextualBody 렌더링
    - [ ] 기존 메시지 타입 (이미지, 파일 등) 영향 없음
    - [ ] `yarn lint:types` 통과

    **Manual Verification**:
    - [ ] AI 채팅에서 DivKit 카드 메시지가 렌더링됨
    - [ ] 일반 텍스트 메시지는 기존처럼 렌더링됨
    - [ ] 이미지/파일 메시지는 기존처럼 렌더링됨

    **Commit**: YES
    - Message: `feat(ai): route AI messages with DivKit cards to DivKitBody`
    - Files: `src/components/views/messages/MessageEvent.tsx`

---

- [x]   4. 버튼 액션 처리 구현

    **What to do**:
    - `src/utils/ClapAIDivKit.ts`에 액션 처리 함수 추가
    - 함수: `handleClapAction(action, room, buttonText)` - clap:// URL 처리
    - DivKitBody의 onCustomAction 콜백에서 호출
    - **메시지 형식**: `{ body: buttonText, "ac.clap.action": actionUrl, msgtype: "m.text" }`
    - MatrixClientPeg.safeGet().sendMessage() 사용

    **Must NOT do**:
    - `clap://` 외 다른 프로토콜 처리

    **Parallelizable**: YES (Task 2와 병렬 가능하나, 통합은 순차)

    **References**:

    **Pattern References**:
    - `src/MatrixClientPeg.ts` - 클라이언트 접근 패턴
    - `src/components/views/rooms/MessageComposer.tsx:sendMessage()` - 메시지 전송 패턴

    **API References**:
    - DivKit onCustomAction:
        ```typescript
        onCustomAction(action: { url: string, log_id: string }) {
          // action.url: "clap://approve?plan_id=123"
          // 버튼의 text는 별도로 찾아야 함 (card JSON에서)
        }
        ```

    **메시지 전송 형식** (CRITICAL):

    ```typescript
    // 버튼 클릭 시 전송할 메시지 content
    {
      "msgtype": "m.text",
      "body": "승인",                    // 버튼의 text 필드
      "ac.clap.action": {
        "url": "clap://action/approve",  // 버튼의 actions[0].url
        "log_id": "approve_001"          // 버튼의 actions[0].log_id
      }
    }
    ```

    - `body`: 버튼 요소의 `text` 필드 값 (라벨)
    - `ac.clap.action.url`: 버튼 요소의 `actions[0].url` 값
    - `ac.clap.action.log_id`: 버튼 요소의 `actions[0].log_id` 값
    - `msgtype`: "m.text" (표준 Matrix 메시지 타입)

    **Acceptance Criteria**:
    - [ ] 버튼 클릭 시 `onCustomAction` 콜백 호출됨
    - [ ] 메시지 content에 `body`와 `ac.clap.action` 객체 포함
    - [ ] `body`는 버튼의 `text` 값
    - [ ] `ac.clap.action.url`은 버튼의 `actions[0].url` 값
    - [ ] `ac.clap.action.log_id`는 버튼의 `actions[0].log_id` 값
    - [ ] 메시지 전송 성공 시 타임라인에 표시됨
    - [ ] `yarn lint:types` 통과

    **Manual Verification**:
    - [ ] "승인" 버튼 클릭 → `{ body: "승인", "ac.clap.action": { url: "...", log_id: "..." } }` 전송됨
    - [ ] "거부" 버튼 클릭 → `{ body: "거부", "ac.clap.action": { url: "...", log_id: "..." } }` 전송됨
    - [ ] 전송된 메시지가 타임라인에 표시됨 (body 텍스트 보임)

    **Commit**: YES
    - Message: `feat(ai): implement button action handling for DivKit cards`
    - Files: `src/utils/ClapAIDivKit.ts`, `src/components/views/messages/DivKitBody.tsx`

---

- [x]   5. Error Boundary 적용

    **What to do**:
    - DivKitBody를 Error Boundary로 감싸기
    - 렌더링 실패 시 fallback UI 표시 (에러 메시지 또는 원본 body 텍스트)
    - onError 콜백에서 에러 로깅

    **Must NOT do**:
    - 새로운 Error Boundary 컴포넌트 생성 (기존 것 활용)

    **Parallelizable**: YES (Task 2와 병렬 가능)

    **References**:

    **Pattern References**:
    - `src/components/views/messages/TileErrorBoundary.tsx` - 기존 Error Boundary
    - `src/components/views/messages/MessageEvent.tsx` - TileErrorBoundary 사용 패턴

    **Fallback UI**:
    - 에러 발생 시 `content.body` (fallback 텍스트) 표시
    - 또는 "카드를 표시할 수 없습니다" 메시지

    **Acceptance Criteria**:
    - [ ] DivKitBody가 Error Boundary로 감싸져 있음
    - [ ] 잘못된 DivKit JSON → fallback UI 표시
    - [ ] 렌더링 에러 → 앱 크래시 없이 fallback 표시
    - [ ] 에러가 콘솔에 로깅됨

    **Manual Verification**:
    - [ ] 정상 카드 → 정상 렌더링
    - [ ] (테스트용) 잘못된 JSON → fallback 표시, 앱 크래시 없음

    **Commit**: YES
    - Message: `feat(ai): add error boundary for DivKit rendering failures`
    - Files: `src/components/views/messages/DivKitBody.tsx` 또는 `MessageEvent.tsx`

---

- [x]   6. 단위 테스트 작성

    **What to do**:
    - `test/components/views/messages/DivKitBody-test.tsx` 파일 생성
    - `test/utils/ClapAIDivKit-test.ts` 파일 생성
    - 테스트 케이스:
        - 정상 DivKit 카드 렌더링
        - palette 변수 매핑 (light/dark)
        - card.variables 변수 매핑
        - 버튼 액션 처리
        - 에러 케이스 (빈 card, 잘못된 JSON)

    **Must NOT do**:
    - E2E 테스트 (별도 작업)
    - 스냅샷 테스트 (DivKit 출력이 복잡함)

    **Parallelizable**: NO (Task 3, 4, 5 완료 필요)

    **References**:

    **Pattern References**:
    - `test/components/views/messages/TextualBody-test.tsx` - Body 컴포넌트 테스트 패턴
    - `test/test-utils/` - 테스트 유틸리티

    **테스트 설정**:
    - `@testing-library/react` 사용
    - DivKit render() 모킹 필요 가능성

    **Acceptance Criteria**:
    - [ ] `yarn test test/components/views/messages/DivKitBody-test.tsx` 통과
    - [ ] `yarn test test/utils/ClapAIDivKit-test.ts` 통과
    - [ ] 커버리지 80% 이상

    **Commit**: YES
    - Message: `test(ai): add unit tests for DivKit rendering`
    - Files: `test/components/views/messages/DivKitBody-test.tsx`, `test/utils/ClapAIDivKit-test.ts`

---

- [x]   7. 통합 검증 및 정리

    **What to do**:
    - 전체 lint 통과 확인: `yarn lint`
    - 전체 테스트 통과 확인: `yarn test`
    - 타입 체크 통과 확인: `yarn lint:types`
    - 불필요한 console.log 제거
    - 주석 정리

    **Must NOT do**:
    - 새로운 기능 추가
    - 리팩토링 (별도 작업)

    **Parallelizable**: NO (모든 작업 완료 필요)

    **References**:

    **명령어**:
    - `yarn lint` - 전체 린트
    - `yarn lint:types` - TypeScript 타입 체크
    - `yarn test` - 전체 테스트

    **Acceptance Criteria**:
    - [ ] `yarn lint` 통과
    - [ ] `yarn lint:types` 통과
    - [ ] `yarn test` 통과
    - [ ] 개발 서버에서 전체 기능 동작 확인

    **Manual Verification**:
    - [ ] ClapAIChatCard에서 DivKit 카드 렌더링 확인
    - [ ] 메인 타임라인 (AI DM)에서 DivKit 카드 렌더링 확인
    - [ ] Light 테마 → light palette 색상 적용 확인
    - [ ] Dark 테마 → dark palette 색상 적용 확인
    - [ ] 테마 변경 시 즉시 색상 변경 확인
    - [ ] "승인" 버튼 클릭 → "승인" 메시지 전송 확인
    - [ ] "거부" 버튼 클릭 → "거부" 메시지 전송 확인

    **Commit**: YES (필요시)
    - Message: `chore(ai): cleanup DivKit integration`
    - Files: 변경된 파일들

---

## Commit Strategy

| After Task | Message                                      | Files                                          | Verification |
| ---------- | -------------------------------------------- | ---------------------------------------------- | ------------ |
| 0          | `chore(deps): add @divkitframework/divkit`   | package.json, yarn.lock                        | import 확인  |
| 1          | `feat(ai): add ClapAIDivKit utility`         | src/utils/ClapAIDivKit.ts                      | lint:types   |
| 2          | `feat(ai): add DivKitBody component`         | src/components/views/messages/DivKitBody.tsx   | lint:types   |
| 3          | `feat(ai): route AI messages to DivKitBody`  | src/components/views/messages/MessageEvent.tsx | lint:types   |
| 4          | `feat(ai): implement button action handling` | 수정된 파일들                                  | lint:types   |
| 5          | `feat(ai): add error boundary for DivKit`    | 수정된 파일들                                  | lint:types   |
| 6          | `test(ai): add unit tests for DivKit`        | test/ 파일들                                   | yarn test    |
| 7          | `chore(ai): cleanup DivKit integration`      | 변경된 파일들                                  | yarn lint    |

---

## Success Criteria

### Verification Commands

```bash
yarn lint:types    # Expected: 0 errors
yarn lint          # Expected: 0 errors
yarn test          # Expected: All tests pass
yarn start         # Expected: Dev server starts
```

### Final Checklist

- [ ] DivKit 카드가 있는 AI 메시지 → 올바르게 렌더링 (수동 QA 필요)
- [ ] DivKit 카드가 없는 AI 메시지 → 기존 TextualBody 렌더링 (수동 QA 필요)
- [ ] Light 테마 → palette.light 색상 적용 (수동 QA 필요)
- [ ] Dark 테마 → palette.dark 색상 적용 (수동 QA 필요)
- [ ] 테마 변경 → 즉시 색상 업데이트 (수동 QA 필요)
- [ ] 버튼 클릭 → 버튼 텍스트가 메시지로 전송 (수동 QA 필요)
- [x] 렌더링 에러 → fallback 표시, 앱 크래시 없음 (Error Boundary 구현 완료)
- [x] 전체 lint 통과
- [x] 전체 테스트 통과
