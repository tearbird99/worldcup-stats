# 🏆 World Cup Stats: Football Scouting & Analysis Tool

---

## 📌 프로젝트 목표
역대 월드컵에 출전한 축구 선수들의 상세 스탯을 시각화하여 비교 분석할 수 있는 풀스택 웹 애플리케이션을 개발하는 프로젝트입니다. 
단순한 텍스트나 표 형태의 데이터를 넘어, 사용자가 직관적으로 선수의 강점과 포지션별 트렌드를 파악할 수 있도록 인터랙티브한 차트를 제공하는 것을 목표로 합니다.

---

## 🎯 구현 예정 기능
- **Radar Analysis (1vs1 비교):** 포지션별(GK, DF, MF, FW) 핵심 스탯을 레이더 차트로 비교 분석.
- **Scatter Trend (산포도 그래프):** 특정 연도 및 포지션의 선수들 전체 대상으로 스캐터 차트로 시각화.
- **Stat Calculation:** Total(총합), Per 90(90분당), Team %(팀 내 비중) 등 다양한 기준의 스탯 계산 기능 제공.

---

## 🛠️ 사용 예정 기술

**Frontend (웹 화면 및 차트 시각화)**
- `React`: 컴포넌트 기반 UI 개발
- `Vite`: 빠르고 최적화된 프론트엔드 빌드 툴
- `Recharts`: 레이더 및 스캐터 차트 렌더링을 위한 시각화 라이브러리
- `Axios`: 백엔드 API와의 비동기 통신
- `html2canvas`: 분석 화면 스크린샷 캡처 및 저장 기능

**Backend (API 서버 및 데이터 제공)**
- `Python`: 백엔드 로직 작성
- `FastAPI`: 빠르고 가벼운 비동기 REST API 서버 구축
- `Uvicorn`: FastAPI 서버 구동을 위한 ASGI 서버

**Data**
- 역대 월드컵 선수 스탯 JSON 데이터 (Sofascore 기반)