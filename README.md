# 도담 (Dodam)

가족·육아 복지 정책 탐색, 조건 입력, 맞춤 추천, 정책 비교, 챗봇 경험을 제공하는 Next.js 프론트엔드입니다.  
현재 레포는 초기 스캐폴드가 아니라, 주요 사용자 흐름이 화면 단위로 연결된 구현 상태를 기준으로 문서를 정리했습니다.

## 프로젝트 개요

- 서비스 목적: 가족 상황에 맞는 출산·육아 복지 정보를 더 쉽게 찾고 비교하도록 돕는 것
- 구현 범위: 홈, 정책 목록/상세, 추천 입력/결과, 정책 비교, 챗봇, 마이페이지
- 데이터 상태: 현재는 `app/data/*`의 더미 데이터 기반으로 동작하며, 추후 API 연동을 위한 구조를 일부 반영하고 있습니다

## 기술 스택

- Next.js 16 App Router
- React 19
- JavaScript
- Bootstrap 5.3
- Axios
- lucide-react

## 실행 방법

Node.js와 npm이 설치되어 있어야 합니다.

```bash
npm install
npm run dev
```

- 개발 서버: [http://localhost:3000](http://localhost:3000)

추가 스크립트:

```bash
npm run build
npm run start
npm run lint
```

## 현재 프로젝트 구조

```text
dodam/
├── package.json
├── next.config.mjs
├── jsconfig.json
├── public/                         # 정적 에셋
└── app/
    ├── layout.js                   # 루트 레이아웃
    ├── globals.css                 # 전역 스타일 및 디자인 시스템
    ├── page.js                     # 홈
    ├── chat/page.js                # 챗봇 화면
    ├── compare/page.js             # 정책 비교 화면
    ├── mypage/page.js              # 마이페이지
    ├── recommend/
    │   ├── page.js                 # 추천 조건 입력
    │   └── result/page.js          # 추천 결과
    ├── policies/
    │   ├── page.js                 # 정책 목록
    │   └── [id]/
    │       ├── page.js             # 정책 상세
    │       ├── apply/page.js       # 신청 준비
    │       └── eligibility/page.js # 지원 가능성
    ├── components/                 # 공통 UI 컴포넌트
    │   ├── Header.js
    │   ├── Footer.js
    │   ├── Modal.js
    │   ├── PolicyCard.js
    │   ├── ActionButtons.js
    │   ├── DisclaimerNote.js
    │   ├── StepIndicator.js
    │   ├── PolicySelect.js
    │   ├── Icon.js
    │   ├── EligibilityResult.js
    │   ├── PolicyCompare.js
    │   └── ApplyPrep.js
    └── data/                       # 더미 데이터 및 상수
        ├── constants.js
        ├── family.js
        └── policies.js
```

## 주요 화면

- `/` : 홈 화면
- `/chat` : 복지 질의응답 챗봇 화면
- `/policies` : 정책 목록 및 탐색
- `/policies/[id]` : 정책 상세
- `/policies/[id]/eligibility` : 지원 가능성 확인
- `/policies/[id]/apply` : 신청 준비 가이드
- `/recommend` : 추천 조건 입력
- `/recommend/result` : 맞춤 추천 결과
- `/compare` : 정책 비교
- `/mypage` : 마이페이지

## 구현 특징

### 1. 모달과 페이지의 콘텐츠 재사용

핵심 기능은 내용 컴포넌트를 분리해 모달과 독립 페이지에서 함께 재사용합니다.

| 기능 | 공용 컴포넌트 | 연결 라우트 |
| --- | --- | --- |
| 지원 가능성 | `EligibilityResult` | `/policies/[id]/eligibility` |
| 정책 비교 | `PolicyCompare` | `/compare` |
| 신청 준비 | `ApplyPrep` | `/policies/[id]/apply` |

이 구조 덕분에 상세 화면 안에서 모달로 보여줄 수도 있고, 별도 URL로 직접 진입하거나 공유할 수도 있습니다.

### 2. 더미 데이터 기반 화면 흐름 구현

- 현재는 API 호출 대신 `app/data/policies.js`, `app/data/family.js`, `app/data/constants.js`를 사용합니다
- Axios는 향후 백엔드 연동을 위한 의존성으로 포함되어 있습니다
- 추천/비교/상세 흐름은 프론트 상태와 데이터 헬퍼를 이용해 동작합니다

### 3. 일관된 디자인 시스템

`app/globals.css`에 코랄/핑크 계열의 브랜드 톤과 공통 UI 클래스가 정리되어 있습니다.

- 카드, 버튼, 배지, 모달, 탭, 스텝 UI를 공통 스타일로 관리
- 정책 결과 화면에는 안내/면책 메시지 패턴을 일관되게 적용
- 홈, 챗봇, 정책 화면이 같은 시각 언어를 사용하도록 구성

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

## 개발 메모

- 상태 관리는 현재 React state 중심으로 구성되어 있습니다.
- 로컬 스토리지나 서버 영속 저장소는 아직 도입하지 않았습니다.
- 실제 복지 판정 결과가 아닌 UI/흐름 중심의 프로토타입 단계이므로, 안내 문구와 면책 문구가 포함되어 있습니다.

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

아래 산출물은 Git에 올리지 않습니다.

- `node_modules/`
- `.next/`
- `.env.local`
- 개인 로컬 설정 파일
- 빌드 결과물
