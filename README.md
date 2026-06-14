# Bistelligence Mini 2 Frontend

복지 정책 추천 및 RAG 기반 질의응답을 위한 React/Next.js 프론트엔드입니다.
2차 미니프로젝트의 프론트엔드 레포로, 정책 탐색, 사용자 조건 입력, 맞춤 정책 추천 결과, RAG 챗봇 화면을 단계적으로 구현합니다.

## 주요 기능 예정

- 메인 화면
- 정책 목록 화면
- 정책 상세 화면
- 사용자 조건 입력 화면
- 맞춤 정책 추천 결과 화면
- RAG 챗봇 화면
- 정책 비교 화면

## 기술 스택

- React
- Next.js
- JavaScript
- Bootstrap
- Axios

현재 레포는 Next.js 초기 프로젝트 상태입니다. Bootstrap과 Axios는 화면 구현 및 백엔드 API 연동 단계에서 사용할 예정입니다.

## 프로젝트 구조

```text
bistel-mini-2-frontend/
├── .github/              # GitHub Actions, PR/Issue 템플릿
├── app/
│   ├── globals.css       # 전역 스타일
│   ├── layout.js         # 공통 레이아웃
│   └── page.js           # 메인 페이지
├── public/               # 정적 파일
├── docs/                 # 온보딩, 협업 규칙, 코드 컨벤션 문서
├── package.json          # npm 스크립트와 패키지 정보
└── package-lock.json     # npm 패키지 잠금 파일
```

추후 기능 구현이 시작되면 `components/`, `apis/` 같은 폴더를 추가해 화면 컴포넌트와 API 요청 코드를 분리할 예정입니다.

## 실행 방법

Node.js와 npm이 설치되어 있어야 합니다.

### 1. 패키지 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

실행 후 아래 주소로 접속합니다.

- 화면 확인: `http://localhost:3000`

## 환경 변수 설정

현재는 환경 변수를 사용하지 않습니다.

추후 백엔드 API와 연동할 때 `.env.local` 파일을 만들고 아래 값을 사용할 예정입니다.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

주의:

- `.env.local`은 Git에 올리지 않습니다.
- 백엔드 API 주소, 외부 서비스 URL 같은 설정값은 코드에 직접 작성하지 않습니다.
- 공유가 필요한 환경 변수 이름은 추후 `.env.example`에 예시로만 작성합니다.

## 협업 규칙 요약

1. GitHub Issue를 먼저 생성합니다.
2. 이슈 번호를 포함한 브랜치를 생성합니다.
3. 작업 후 커밋 메시지 규칙에 맞게 커밋합니다.
4. 브랜치를 push하고 Pull Request를 생성합니다.
5. PR 본문에 `Closes #이슈번호`를 작성합니다.
6. 리뷰와 자동화 검사를 통과한 뒤 merge합니다.
7. PR이 merge되면 연결된 이슈가 자동으로 닫힙니다.

브랜치명 형식:

```text
type/issue-number-description
```

예시:

```text
feature/2-main-layout
feature/3-policy-list-page
fix/4-api-base-url
```

커밋 메시지와 PR 제목 형식:

```text
type: 작업 내용
```

예시:

```text
feat: 메인 화면 레이아웃 추가
docs: README 작성
fix: API baseURL 설정 오류 수정
```

기본 원칙:

- `main`과 `develop`에는 직접 push하지 않습니다.
- 작업은 이슈 기반 브랜치에서 진행합니다.
- PR 본문에는 `Closes #이슈번호`를 작성합니다.
- 여러 이슈를 닫아야 하면 `Closes #6`, `Fixes #7`처럼 여러 줄로 작성합니다.

## 문서 링크

- [프로젝트 참여 및 실행 가이드](docs/ONBOARDING.md)
- [GitHub 협업 규칙](docs/CONVENTION.md)
- [프론트엔드 코드 작성 규칙](docs/CODE_CONVENTION.md)

## 주의사항

아래 파일과 산출물은 Git에 올리지 않습니다.

- `node_modules/`
- `.next/`
- `.env.local`
- 빌드 결과물
- 개인 로컬 설정 파일
