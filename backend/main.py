import os
import json
import unicodedata
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# 데이터 파일의 기본 경로 설정
BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

# JSON 데이터를 저장하고 디스크 I/O를 줄이기 위한 인메모리 캐시 구조
CACHE = {
    "years": [],
    "teams": {},
    "players": {},
    "stats": {},
    "team_stats": {},
    "search_pool": [],
    "scatter_pool": []
}

def normalize_string(s):
    """
    정확한 검색 기능을 위해 발음 구별 기호를 제거하고 소문자로 변환하여 문자열 정규화.
    """
    if not s: return ""
    return ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn'
    ).lower()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    수명 주기(Lifespan) 이벤트 핸들러.
    서버 시작 시 모든 JSON 파일을 메모리(CACHE)에 적재.
    매 API 요청마다 발생하는 파일 읽기 작업을 방지.
    """
    print("서버 시작: 데이터를 메모리에 적재 중...")
    if not os.path.exists(BASE_DIR):
        yield
        return

    years = [d for d in os.listdir(BASE_DIR) if os.path.isdir(os.path.join(BASE_DIR, d))]
    CACHE["years"] = sorted(years, reverse=True)

    for year in CACHE["years"]:
        year_path = os.path.join(BASE_DIR, year)
        teams = [d for d in os.listdir(year_path) if os.path.isdir(os.path.join(year_path, d))]
        CACHE["teams"][year] = sorted(teams)

        for team in teams:
            team_path = os.path.join(year_path, team)
            team_key = f"{year}_{team}"
            CACHE["players"][team_key] = []
            
            # 팀 단위 통계 데이터 적재
            team_file_v1 = os.path.join(team_path, "team", f"{year}_{team}.json")
            team_file_v2 = os.path.join(team_path, f"{year}_{team}.json")
            if os.path.exists(team_file_v1):
                with open(team_file_v1, 'r', encoding='utf-8') as f:
                    CACHE["team_stats"][team_key] = json.load(f)
            elif os.path.exists(team_file_v2):
                with open(team_file_v2, 'r', encoding='utf-8') as f:
                    CACHE["team_stats"][team_key] = json.load(f)
            else:
                CACHE["team_stats"][team_key] = {"stats": {}}

            # 검색 풀에 팀 추가
            CACHE["search_pool"].append({
                "name": team, "year": year, "team": team, 
                "position": "TEAM", "id": f"{year}_{team}_TEAM",
                "norm_name": normalize_string(team)
            })

            # 개별 선수 통계 데이터 적재
            for file in os.listdir(team_path):
                if file.endswith(".json") and not file.startswith(year):
                    try:
                        with open(os.path.join(team_path, file), 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        
                        stat_key = f"{year}_{team}_{file}"
                        CACHE["stats"][stat_key] = data
                        
                        meta = data.get('meta', {})
                        stats = data.get('stats', {})
                        p_name = meta.get('name', file.replace(".json", ""))
                        p_pos = meta.get('position', 'M')
                        
                        CACHE["players"][team_key].append({
                            "name": p_name, "filename": file, "position": p_pos
                        })
                        
                        CACHE["search_pool"].append({
                            "name": p_name, "year": year, "team": team, 
                            "filename": file, "position": p_pos, 
                            "id": stat_key, "norm_name": normalize_string(p_name)
                        })
                        
                        # 최소 출전 시간 조건을 충족할 경우 스캐터 풀에 추가
                        if stats.get('minutesPlayed', 0) >= 90:
                            CACHE["scatter_pool"].append({
                                "name": p_name, "team": meta.get('team', team),
                                "position": p_pos, "year": year, "filename": file, "id": stat_key,
                                "minutes": stats.get('minutesPlayed', 0),
                                "goals": stats.get('goals', 0),
                                "assists": stats.get('assists', 0),
                                "shotsOnTarget": stats.get('shotsOnTarget', 0),
                                "keyPasses": stats.get('keyPasses', 0),
                                "passes": stats.get('accuratePasses', 0),
                                "successfulDribbles": stats.get('successfulDribbles', 0),
                                "totalDuelsWon": stats.get('totalDuelsWon', 0),
                                "rating": stats.get('rating', 0),
                                "wasFouled": stats.get('wasFouled', 0),
                                "saves": stats.get('saves', 0),
                                "goalsConceded": stats.get('goalsConceded', 0),
                                "accuratePassesPercentage": stats.get('accuratePassesPercentage', 0),
                                "accurateLongBallsPercentage": stats.get('accurateLongBallsPercentage', 0),
                                "highClaims": stats.get('highClaims', 0),
                                "runsOut": stats.get('runsOut', 0),
                                "tacklesWon": stats.get('tacklesWon', 0),
                                "interceptions": stats.get('interceptions', 0),
                                "clearances": stats.get('clearances', 0),
                                "accuratePasses": stats.get('accuratePasses', 0),
                                "aerialDuelsWon": stats.get('aerialDuelsWon', 0),
                                "aerialDuelsWonPercentage": stats.get('aerialDuelsWonPercentage', 0),
                            })
                    except Exception:
                        continue
            
            CACHE["players"][team_key].sort(key=lambda x: x['name'])
            
    CACHE["search_pool"].sort(key=lambda x: x['year'], reverse=True)
    print("데이터 적재 완료.")
    yield
    print("서버 종료: 캐시 초기화.")
    CACHE.clear()

app = FastAPI(lifespan=lifespan)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/years")
def get_years():
    """이용 가능한 월드컵 연도 목록 반환."""
    return CACHE["years"]

@app.get("/api/teams")
def get_teams(year: str):
    """특정 연도의 참가 팀 목록 반환."""
    return CACHE["teams"].get(year, [])

@app.get("/api/players")
def get_players(year: str, team: str):
    """특정 연도 및 팀의 소속 선수 목록 반환."""
    return CACHE["players"].get(f"{year}_{team}", [])

@app.get("/api/stats")
def get_stats(year: str, team: str, filename: str):
    """특정 선수의 상세 통계 데이터 반환."""
    stat_key = f"{year}_{team}_{filename}"
    if stat_key not in CACHE["stats"]:
        raise HTTPException(status_code=404, detail="Player file not found") 
    return CACHE["stats"][stat_key]

@app.get("/api/team_stats")
def get_team_stats(year: str, team: str):
    """팀 단위 집계 통계 데이터 반환."""
    return CACHE["team_stats"].get(f"{year}_{team}", {"stats": {}})

@app.get("/api/search")
def search_players(q: str = Query(..., min_length=2), type: str = "player"):
    """정규화된 문자열을 기반으로 선수 또는 팀 검색."""
    query_norm = normalize_string(q)
    results = [
        item for item in CACHE["search_pool"]
        if ((type == "team" and item["position"] == "TEAM") or (type != "team" and item["position"] != "TEAM"))
        if query_norm in item["norm_name"]
    ]
    return results[:20]

@app.get("/api/scatter_data")
def get_scatter_data(year: str):
    """스캐터 플롯 시각화를 위한 집계 데이터 반환."""
    if year == "ALL":
        return CACHE["scatter_pool"]
    return [p for p in CACHE["scatter_pool"] if p["year"] == year]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)