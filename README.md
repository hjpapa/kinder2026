# 도담비서 : 누리

유치원 교사가 짧은 메모를 바탕으로 놀이 기록, 행사 계획, 결과 보고, 가정통신문, 예상 품의서와 영수증 정산서를 만들고 직접 검토·수정·내보내는 Next.js 웹앱입니다.

AI는 입력한 사실만 구조화하도록 설계되어 있으며, 날짜·인원·금액·담당자·성과처럼 제공되지 않은 정보는 임의로 만들지 않습니다. 최종 문서의 판단과 확인 책임은 교사에게 있습니다.

## 구현 범위

- 1단계: 핵심 메모 한 개 중심의 놀이 기록, 행사 계획, 실제 내용 중심 결과 보고, 가정통신문
- 2단계: 실제 OpenAI API Structured Outputs, 기관 문체·사용자 지정 항목, 여러 초안, JSON 백업·복원, 브라우저별 요청량 통계
- 3단계: 완성형 웹 문서 미리보기, 실제 표가 포함된 DOCX, 요약 카드 PNG, 사진 자리, 예상 품의서, 영수증 이미지 판독 정산서, 놀이 지원자료 이미지
- 의도적 제외: 계정, 기관별 사용자 권한, 암호화된 서버 저장

초안·설정·템플릿은 브라우저 `localStorage`에만 저장합니다. 영수증 원본 이미지는 초안이나 서버 저장소에 보관하지 않고, 판독 후 사용자가 확인한 텍스트 값만 초안에 저장합니다. 기관 지침은 사용자가 제공한 TXT/MD/JSON 텍스트를 현재 브라우저에서 연결합니다.

## 로컬 실행

Node.js 20.9 이상이 필요합니다.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

`http://localhost:3000`에서 확인할 수 있습니다.

## 환경 변수

| 변수 | 설명 |
| --- | --- |
| `OPENAI_API_KEY` | 서버 Route Handler에서만 사용하는 OpenAI API 키 |
| `OPENAI_MODEL` | 문서 생성 모델. 기본값 `gpt-5.6-terra` |
| `OPENAI_IMAGE_MODEL` | 놀이 지원자료 이미지 모델. 기본값 `gpt-image-2` |
| `DEMO_MODE` | `true`이면 API 대신 샘플 결과만 사용 |
| `DEMO_FALLBACK` | 실제 생성 실패 후 사용자가 샘플 결과를 선택할 수 있게 함 |
| `NEXT_PUBLIC_APP_URL` | 선택 항목. 메타데이터의 프로덕션 기준 URL |

`.env.local`은 Git에서 제외됩니다. API 키를 브라우저 코드, GitHub 저장소, 문서 본문에 넣지 마세요.

## 개인정보 보호

- 놀이 기록은 전송 전에 실명을 `유아 A`, `유아 B`로 치환합니다.
- 연락처, 이메일, 주민등록번호 형태와 주소 표현을 자동 마스킹하고 전송 전 요약을 표시합니다.
- OpenAI Responses API 요청에 `store: false`를 사용합니다.
- 이미지 생성에는 실명, 유아 사진, 민감정보를 사용하지 않으며 결과를 서버에 보관하지 않습니다.
- 영수증은 카드번호·승인번호·회원번호·이름·연락처·상세 주소를 가린 뒤 전송하도록 안내하고, JPG·PNG·WebP만 압축·검증해 처리합니다.
- 서버 요청 제한은 외부 DB를 쓰지 않는 인메모리 방식이라 Vercel 서버리스 인스턴스 전체를 아우르는 강제 한도는 아닙니다.

## 품질 확인

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

테스트는 개인정보 마스킹, 예산·정산 계산, 영수증 형식과 용량 검증, Structured Output 스키마, 구조화 문서·DOCX 내보내기, 로컬 저장소 동작을 다룹니다.

## 배포

GitHub 저장소는 `hjpapa/kinder2026`이며 Vercel에서 Next.js 프로젝트로 연결합니다. 프로덕션 환경 변수에는 `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_IMAGE_MODEL`을 설정합니다.

배포 후 `/api/generate/*` 호출은 서버에서 실행되므로 OpenAI 키가 클라이언트 번들에 포함되지 않습니다.

## 주요 기술

- Next.js App Router, React, TypeScript, Tailwind CSS
- OpenAI 공식 JavaScript SDK와 Responses API Structured Outputs
- Zod 입력·출력 검증
- `docx` 기반 DOCX 내보내기
- Vitest와 Testing Library

원본 제작 명세는 [`교사의_AI_준비실_Codex_웹앱_제작명세.md`](./교사의_AI_준비실_Codex_웹앱_제작명세.md)에 있습니다.
