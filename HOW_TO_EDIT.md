# Emotive Design 2027 — Website Guide / 사용 안내

## Open / 열기
Double-click **index.html** — it opens in your browser (Chrome, Edge, Safari).
**index.html** 더블클릭으로 브라우저에서 바로 열립니다.

## Design / 디자인
Swiss/Vignelli 편집 시스템: 흰 배경의 초대형 **EMOTIVE / DESIGN** 타이포와 우측 히어로 영상이 엄격한 그리드로 나뉩니다. 히어로 영상은 원본 색상으로 한 개의 클립을 연속 반복 재생합니다.

## Edit mode / 편집 모드
Click **✎ Edit page** (bottom-right). / 우측 하단 **✎ Edit page** 클릭.

- **Text** — 점선 표시된 모든 텍스트(타이틀, 날짜, 세션 설명 등) 클릭 후 바로 수정.
- **Speakers** — 검은 배경의 4열 흑백 초상 그리드(Vercel Ship 2025 speakers 페이지 스타일). 카드 위에 마우스를 올리면 역할 칩(KEYNOTE/DISCUSSANT)이 나타납니다. 소속 로고는 사진 좌측 상단에 원래 색상 그대로 얹힙니다(`assets/logo/`). 사진에만 흑백 필터가 걸려 있어 로고는 색이 유지됩니다. 편집 모드에서 그리드 끝의 **+ Add speaker**로 추가하고 카드 오른쪽 위 빨간 **×**로 삭제합니다. 확정: Seung Yeul Ji, Ju Hyun Lee, Michael Ostwald, Hanjong Jun, Mi Jeong Kim, Jaehwan Kim, Bao-Liang Lu, Kyung Ho Ko, Yeon Shim Chung, Luo Mi, Yun Kyung Lee, Jin Woo Lee, Eon Yong Kim, Daeil Song, Jong Jin Park, Hyunkyu Shin.
- **Hero video** — 편집 모드에서 우측 상단 **✎ Clip 1** 버튼으로 히어로 클립 교체 (파일 선택 또는 경로/URL 입력). Clipchamp/CapCut 편집기 바로가기 포함.
- **Research Films** — 왼쪽 플레이어 하나 + 오른쪽 번호 재생목록(Take 01–08). 목록에서 고르면 바로 재생되고, 한 편이 끝나면 다음 편이 이어서 재생됩니다(마지막 편에서 멈춤).
  - 영상 추가/순서 변경: 웹용 파일을 `assets/films/`에, 포스터를 `assets/films/posters/`에 넣고 `index.html`의 `RESEARCH_FILMS` 배열에 한 줄을 추가합니다(화면의 Take 번호는 파일 이름이 아니라 이 배열의 차례를 따릅니다)(제목 `title`, 출처 `meta`, 상영 시간 `time`).
  - 웹용 파일 만들기(화질 그대로, 메타데이터 제거, 바로 재생되게): `ffmpeg -i 원본.mp4 -c copy -map_metadata -1 -movflags +faststart assets/films/이름.mp4`
  - 예전에 혼자 걸려 있던 Monster Space 트레일러는 언제나 **맨 앞(Take 01)** 이고, 다큐멘터리 Monster Space — Focus on EEG가 **맨 끝(Take 08)** 입니다. 트레일러는 편집 모드에서 영상 위 **Change the first film** 버튼으로 교체할 수 있습니다.
  - 부하: 재생을 누르기 전에는 영상 데이터를 받지 않습니다(`preload="none"`). 포스터도 구역이 화면 가까이 올 때 1장만 받습니다.
- **✓ Done** — 저장 (이 브라우저에 자동 저장).
- **⬇ Export HTML** — 편집 내용이 반영된 단일 HTML 파일 다운로드 (공유/호스팅용).

## Videos / 영상
- `assets/hero-video.mp4` = 히어로 영상 (웹 호환 H.264, 무음, 연속 반복 재생).
- 원본 MOV는 편집용 소스로 로컬에 보존하며 웹사이트에는 업로드하지 않습니다.
- `assets/emotive-film-trailer.mp4` = 몬스터 스페이스 트레일러 (웹용 압축본, 로컬 재생).

## Files / 파일 구성
```
Emotive_Design_2027_Website/
  index.html          the site (open this)
  HOW_TO_EDIT.md      this guide
  assets/
    logo/                         institution marks (original colours, transparent)
    emotive-film-trailer.mp4     your film (web-optimized)
    films/                       Research Films playlist (web-optimized mp4) + posters/
    hero-video.mp4                hero video (web-optimized)
    human/
      seung-yeul-ji.webp          speaker portrait (web-optimized)
      ju-hyun-lee.webp            speaker portrait (web-optimized)
      michael-ostwald.webp        speaker portrait (web-optimized)
      hanjong-jun.webp            speaker portrait (web-optimized)
      mi-jeong-kim.webp           speaker portrait (web-optimized)
      jaehwan-kim.webp            speaker portrait (web-optimized)
      bao-liang-lu.webp           speaker portrait (web-optimized)
      kyung-ho-ko.webp            speaker portrait (web-optimized)
      yeon-shim-chung.webp        speaker portrait (web-optimized)
      luo-mi.webp                 speaker portrait (web-optimized)
      yun-kyung-lee.webp          speaker portrait (web-optimized)
      jin-woo-lee.webp            speaker portrait (web-optimized)
      eon-yong-kim.webp           speaker portrait (web-optimized)
      daeil-song.webp             speaker portrait (web-optimized)
      jong-jin-park.webp          speaker portrait (web-optimized)
      hyunkyu-shin.webp           speaker portrait (web-optimized)
```
