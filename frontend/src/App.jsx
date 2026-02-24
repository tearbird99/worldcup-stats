import { useState, useEffect } from 'react'
import './App.css'

import legendImg from './assets/Legends.png' 
import RadarView from './components/radar/RadarView'
import ScatterView from './components/scatter/ScatterView'

function App() {
  // URL 쿼리 파라미터를 파싱하여 초기 뷰 상태 설정 (디폴트: 'home')
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('view') || 'home'
  })

  // URL 쿼리 파라미터에서 선택된 선수 정보 추출 및 상태 초기화
  const [selectedPlayer, setSelectedPlayer] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') === 'radar' && params.get('id')) {
      return {
        id: params.get('id'),
        name: params.get('name'),
        team: params.get('team'),
        year: params.get('year'),
        filename: params.get('filename'),
        position: params.get('position')
      }
    }
    return null
  })

  // 뷰 상태 변경 시 브라우저 History API를 통해 URL 새로고침 없이 동기화
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('id')) {
      window.history.replaceState({}, document.title, `${window.location.pathname}?view=${view}`)
    }
  }, [view])

  // 스캐터 차트에서 특정 선수 클릭 시 쿼리 파라미터를 포함하여 레이더 뷰를 새 탭으로 오픈
  const handlePlayerClickFromScatter = (player) => {
    const queryParams = new URLSearchParams({
      view: 'radar',
      id: player.id,
      name: player.name,
      team: player.team,
      year: player.year,
      filename: player.filename,
      position: player.position
    }).toString()

    window.open(`${window.location.origin}/?${queryParams}`, '_blank')
  }

  return (
    <div className="app-container">
      {/* 홈 화면 조건부 렌더링 */}
      {view === 'home' && (
        <div className="home-content fade-in">
          <header className="home-header">
            <div className="title-section">
              <img 
                src={legendImg} 
                alt="Legends" 
                className="legends-image"
              />
              <h1 className="main-title">WORLD CUP STATS</h1>
              <p className="sub-title">Football Scouting & Analysis Tool</p>
            </div>
          </header>

          <div className="menu-grid">
            <div className="menu-card" onClick={() => setView('radar')}>
              <div className="card-icon">🕸️</div>
              <h2>Radar Analysis</h2>
              <p>Compare specific player stats (1vs1)</p>
            </div>

            <div className="menu-card" onClick={() => setView('scatter')}>
              <div className="card-icon">📈</div>
              <h2>Scatter Trend</h2>
              <p>Analyze competition stat correlations</p>
            </div>
          </div>
        </div>
      )}

      {/* 레이더 뷰 화면 조건부 렌더링 */}
      {view === 'radar' && (
        <RadarView 
          onBack={() => {
            setView('home')
            setSelectedPlayer(null)
          }} 
          initialPlayer={selectedPlayer} 
        />
      )}

      {/* 스캐터 뷰 화면 조건부 렌더링 */}
      {view === 'scatter' && (
        <ScatterView 
          onBack={() => setView('home')} 
          onPlayerClick={handlePlayerClickFromScatter} 
        />
      )}
    </div>
  )
}

export default App