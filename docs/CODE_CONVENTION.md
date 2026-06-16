# Frontend Code Convention

이 문서는 `bistel-mini-2-frontend` 프로젝트에서 React/Next.js 프론트엔드 코드를 작성할 때 지킬 규칙입니다.

## JavaScript 코드 스타일

- 함수명과 변수명은 `camelCase`를 사용합니다.
- 컴포넌트명은 `PascalCase`를 사용합니다.
- 상수명은 `UPPER_SNAKE_CASE`를 사용합니다.
- 한 함수나 컴포넌트가 너무 많은 일을 하지 않도록 작게 나눕니다.
- 이름만 보고 역할을 알 수 있게 작성합니다.

예시:

```javascript
function formatPolicyTitle(policyTitle) {
  return policyTitle.trim();
}

function PolicyCard() {
  return null;
}

const DEFAULT_PAGE_SIZE = 20;
```

## 파일/폴더 네이밍

- React 컴포넌트 파일은 `PascalCase`를 사용합니다.
- 일반 유틸 파일은 `camelCase` 또는 `kebab-case`를 사용할 수 있습니다.
- 기능별로 폴더를 분리합니다.
- 공통으로 쓰는 컴포넌트는 `components/`에 둡니다.
- API 요청 관련 코드는 추후 `apis/`에 둡니다.
- 한 파일이 너무 커지면 역할별로 나눕니다.

예시:

```text
PolicyCard.js
PolicyList.js
formatDate.js
policy-filter.js
```

## 현재 프로젝트 폴더 역할

- `app/`: Next.js App Router 화면과 레이아웃
- `app/layout.js`: 전체 앱 공통 레이아웃
- `app/page.js`: 루트 경로(`/`) 페이지
- `app/globals.css`: 전역 스타일
- `public/`: 이미지, 아이콘 등 정적 파일
- `docs/`: 문서
- `components/`: 추후 공통 컴포넌트 위치
- `apis/`: 추후 API 요청 설정과 함수 위치

## Next.js App Router 작성 규칙

- 페이지는 App Router 구조에 맞게 `app/` 아래에 작성합니다.
- 공통 레이아웃은 `layout.js`에서 관리합니다.
- 화면 단위 컴포넌트와 재사용 컴포넌트를 분리합니다.
- 클라이언트 상태나 이벤트가 필요한 경우에만 Client Component를 사용합니다.
- 컴포넌트 안에 API 호출, 상태 관리, 렌더링 로직이 과하게 몰리지 않도록 분리합니다.

라우트 예시:

```text
/
/policies
/policies/[policyId]
/recommend
/rag-chat
```

## 계층 분리 기준

- page: 라우트 진입점, 화면 조합
- components: 재사용 가능한 UI 컴포넌트
- apis: Axios 설정, API 요청 함수
- utils: 포맷팅, 변환 등 순수 유틸 함수
- styles: 공통 스타일 또는 컴포넌트별 스타일

기능이 커지면 아래처럼 분리합니다.

```text
components/policy/
├── PolicyCard.js
├── PolicyList.js
└── PolicyFilter.js

apis/
└── axiosConfig.js
```

## API 요청 규칙

- 추후 Axios 설정은 `apis/axiosConfig.js`에서 관리합니다.
- API baseURL은 `NEXT_PUBLIC_API_BASE_URL` 환경 변수로 관리합니다.
- 백엔드 API 주소를 컴포넌트 코드에 직접 작성하지 않습니다.
- API 요청 함수는 화면 컴포넌트와 분리합니다.
- API 응답 구조가 바뀌면 관련 문서나 타입 설명을 함께 수정합니다.

## 스타일 규칙

- 스타일은 Bootstrap 기반으로 작성합니다.
- 전체 공통 스타일은 `app/globals.css`에서 관리합니다.
- 같은 스타일을 여러 곳에 반복해서 작성하지 않습니다.
- 화면 구조를 해치지 않도록 컴포넌트 단위로 스타일 책임을 분리합니다.

## 환경 변수 규칙

- 현재는 환경 변수를 사용하지 않습니다.
- 추후 `.env.local`은 로컬에서만 사용합니다.
- `.env.local`은 Git에 올리지 않습니다.
- `.env.example`에는 예시값만 작성합니다.
- 브라우저에서 접근해야 하는 값은 `NEXT_PUBLIC_` 접두사를 사용합니다.
- API 주소, 토큰, Discord Webhook URL 같은 민감정보를 코드에 직접 작성하지 않습니다.

## 로그 규칙

- 단순 확인용 `console.log()`는 커밋 전에 제거합니다.
- 에러 상황에서는 원인을 추적할 수 있는 메시지를 남깁니다.
- 민감정보가 브라우저 콘솔에 찍히지 않도록 주의합니다.

## Git에 올리지 말아야 할 것

- `.env.local`
- `node_modules/`
- `.next/`
- 빌드 결과물
- 개인 로컬 설정 파일
- 민감정보가 포함된 테스트 데이터

## 코드 리뷰 기준

리뷰할 때는 아래 항목을 확인합니다.

- 기능이 한 파일에 과하게 몰리지 않았는지
- 컴포넌트 이름과 역할이 명확한지
- 화면 단위와 공통 컴포넌트가 적절히 분리되어 있는지
- API 호출 위치가 명확한지
- 백엔드 API 주소가 하드코딩되어 있지 않은지
- `.env.local`, `node_modules/`, `.next/` 같은 불필요한 파일이 포함되지 않았는지
- 실행 방법이나 환경 변수가 바뀌었다면 문서에 반영되었는지
