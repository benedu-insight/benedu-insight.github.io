[README.md](https://github.com/user-attachments/files/34209535/README.md)
# Benedu Insight 홈페이지 리뉴얼 2026 — Emission Line

`index.html`을 브라우저로 바로 열면 됩니다(빌드 과정 없음). 글꼴은 Google Fonts에서 불러오므로 인터넷 연결이 필요합니다.

## 콘셉트

초록 링 안에서 RF로 점화된 플라즈마의 빛이 실제 발광선(nm)으로 갈라지고, 그 선들이 페이지 하단의 내비게이션 레일이 됩니다.

| 섹션 | 발광선 |
|---|---|
| 철학 | Ar II 434.8 nm |
| 전문성 | Hβ 486.1 nm |
| 커리큘럼 | CO 519.8 nm |
| 교수법 | He I 587.6 nm |
| 강사 | Hα 656.3 nm |
| 문의 | O I 777.2 nm (근적외선이라 점선) |

- **히어로**: RF Power 슬라이더와 Gas(Ar·O₂·CF₄·N₂) 선택에 따라 플라즈마 색과 하단 스펙트럼이 바뀝니다. 60 W에서 점화되고 30 W 아래에서 꺼집니다(Hysteresis).
- **철학**: 스크롤하면 흩어진 수식과 용어가 CCP Chamber 단면도 한 장으로 모입니다.
- **커리큘럼**: "어디에서 오셨나요?"에서 하나를 고르면 권장 과정이 강조됩니다. 모듈마다 "담기"로 고른 구성은 문의서 본문에 자동으로 채워집니다.
- **문의 폼**: 기존 사이트와 같이 formsubmit.co(`benedu.insight@gmail.com`)로 전송합니다.
- **언어**: KO/EN 전환을 지원하고, 선택한 언어는 기억됩니다. `?lang=en`으로 영문 페이지를 바로 열 수 있습니다.
- **모션 줄이기**: 시스템의 '동작 줄이기' 설정이 켜져 있으면 애니메이션 없이 켜진 상태의 정지 화면을 보여 줍니다.

## 폴더 구성

```
index.html
assets/css/style.css
assets/js/core.js      언어 전환, 발광선 데이터, 하단 스펙트럼 레일
assets/js/main.js      Chamber 조립, 과정 찾기, 레시피, 문의 폼
assets/js/plasma.js    히어로 플라즈마 캔버스
assets/logo/           공식 로고 SVG(01_SVG_웹용에서 복사, 수정하지 않음)
assets/img/            기존 사이트 사진을 압축·크롭한 파일
PRODUCT.md             제품 정보 요약(디자인 작업용)
.impeccable/           디자인 작업 기록과 검수 스크린샷 — 배포에서 제외해도 됩니다
```

## 배포 시 확인할 것

- `og:image`와 `canonical`은 현재 운영 주소(`https://benedu-insight.github.io/`)를 그대로 가리킵니다. 경로가 바뀌면 함께 수정해 주세요.
- 에셋 링크에는 캐시를 피하기 위한 `?v=` 번호가 붙어 있습니다. CSS나 JS를 고친 뒤에는 이 번호를 올려 주세요.
