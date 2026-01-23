# 서지관리 프로그램 (AI Paper Management)

AI를 활용한 논문 PDF 자동 분석 및 체계적 관리 시스템

## 🎯 주요 기능

- ✨ **AI 자동 분석**: Gemini 2.0 Flash + GPT-4o-mini를 활용한 논문 자동 분석
- 📚 **체계적 관리**: 주제별 논문 분류 및 정리
- ☁️ **완전 서버리스**: Google Drive + Firebase로 비용 제로 운영
- 🔄 **실시간 동기화**: Firestore를 통한 실시간 데이터 동기화
- 📊 **동적 폼**: 드롭다운으로 논문 필드 개수 선택 (0-10개)

## 🛠️ 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (서버리스)
- **Database**: Firebase Firestore
- **Storage**: Google Drive API
- **AI**: Gemini 2.0 Flash, GPT-4o-mini
- **Auth**: Firebase Authentication (Google OAuth)
- **State**: Zustand
- **UI**: Radix UI

## 📋 사전 준비

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `paper-management`)
4. Google Analytics 비활성화 (선택사항)
5. 프로젝트 설정 > 일반 > 앱 추가 > 웹
6. Firebase SDK 구성 정보 복사

### 2. Firebase Authentication 설정

1. Firebase Console > Authentication > Sign-in method
2. Google 제공업체 활성화
3. 프로젝트 지원 이메일 입력

### 3. Firestore Database 생성

1. Firebase Console > Firestore Database
2. "데이터베이스 만들기" 클릭
3. **테스트 모드**로 시작 (나중에 규칙 설정)
4. 서버 위치 선택 (asia-northeast3 - 서울 권장)

### 4. Google Cloud OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 (Firebase 프로젝트와 동일)
3. API 및 서비스 > 사용자 인증 정보
4. "사용자 인증 정보 만들기" > OAuth 2.0 클라이언트 ID
5. 애플리케이션 유형: 웹 애플리케이션
6. 승인된 JavaScript 원본: `http://localhost:3000`
7. 승인된 리디렉션 URI: Firebase Auth 도메인 (Firebase Console의 Authentication > Settings에서 확인)
8. 클라이언트 ID와 시크릿 복사

### 5. Google Drive API 활성화

1. Google Cloud Console > API 및 서비스 > 라이브러리
2. "Google Drive API" 검색
3. "사용 설정" 클릭

### 6. AI API 키 발급

#### Gemini API

1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. "API 키 만들기" 클릭
3. API 키 복사

#### OpenAI API (선택사항)

1. [OpenAI Platform](https://platform.openai.com/api-keys) 접속
2. "Create new secret key" 클릭
3. API 키 복사

## 🚀 설치 및 실행

### 1. 환경 변수 설정

`.env.local.example`을 복사하여 `.env.local` 생성:

```bash
cp .env.local.example .env.local
```

`.env.local` 파일에 본인의 키 입력:

```env
# Firebase Configuration (Firebase Console에서 복사)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Google OAuth & Drive API
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# AI APIs
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Dependencies 설치 (이미 완료됨)

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 📁 프로젝트 구조

```
├── app/
│   ├── page.tsx              # 로그인 페이지
│   ├── dashboard/            # 대시보드 (4단 레이아웃)
│   └── api/                  # API routes
├── components/
│   ├── ui/                   # shadcn/ui & 기본 컴포넌트
│   ├── layout/               # FourPanelLayout, TopBar 등
│   ├── sidebars/             # TopicsTree, PaperList, MetadataPanel
│   └── main/                 # PDFViewer
├── lib/
│   ├── firebase/             # Firebase 클라이언트 & 인증
│   ├── google-drive/         # Google Drive API 클라이언트
│   ├── ai/                   # AI 분석 파이프라인
│   ├── db/                   # Firestore CRUD
│   └── utils.ts              # 유틸리티 functions
└── store/
    └── useAppStore.ts        # Zustand 전역 상태
```

## 🎨 현재 진행 상황

### ✅ 완료

- [x] Next.js 프로젝트 초기화
- [x] Firebase 인증 (Google OAuth)
- [x] Google Drive API 클라이언트
- [x] Gemini 2.0 Flash 분석기
- [x] GPT-4o-mini 검증기
- [x] AI 분석 파이프라인 통합
- [x] Firestore CRUD (topics, papers)
- [x] Zustand 상태 관리
- [x] 로그인 페이지
- [x] **4단 패널 대시보드 레이아웃** (Topics, Papers, PDF, Metadata)
- [x] PDF 업로드 & 뷰어 (기본 구현)
- [x] 동적 메타데이터 폼 & 자동 저장

### 🚧 개발 예정

- [ ] AI 분석 결과 시각화 (고도화)
- [ ] 주제/논문 관리 UI (기능 개선)
- [ ] 검색 및 정렬 기능
- [ ] 다크 모드
- [ ] 반응형 디자인

## 📝 사용 방법

### 1. 로그인

- Google 계정으로 로그인
- Drive 권한 승인

### 2. 주제 생성 (개발 예정)

- 좌측 사이드바에서 "+ 새 주제" 클릭
- 주제명, 색상, 아이콘 설정

### 3. 논문 업로드 & 분석 (개발 예정)

- 중앙 사이드바에서 "+ PDF 업로드"
- 드래그 앤 드롭 또는 파일 선택
- "분석하기" 버튼 클릭
- AI가 자동으로 서지 정보 추출

### 4. 결과 확인 (개발 예정)

- 우측 사이드바에 분석 결과 표시
- "폼에 적용" 버튼으로 자동 채우기
- 수동 편집 가능

## 🔒 보안

- API 키는 환경 변수로 관리
- Firebase Auth로 사용자 인증
- Firestore Security Rules 설정 필요
- Google Drive는 사용자 개인 Drive 사용

## 📄 라이센스

MIT

## 👥 개발자

AI Assistant + User

---

## 🐛 알려진 이슈

- [ ] Firebase Security Rules 미설정 (현재 테스트 모드)
- [ ] PDF.js worker 경로 설정 필요
- [ ] TypeScript 타입 개선 필요

## 📌 참고 문서

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Drive API](https://developers.google.com/drive)
- [Gemini API](https://ai.google.dev/docs)
- [OpenAI API](https://platform.openai.com/docs)
