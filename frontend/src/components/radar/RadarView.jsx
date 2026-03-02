import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import axios from 'axios'
import html2canvas from 'html2canvas'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip
} from 'recharts'
import './RadarView.css'
import backIcon from '../../assets/icon_back.png'
import cameraIcon from '../../assets/icon_camera.png'

// 백엔드 서버 주소
const API_BASE_URL = 'https://worldcupstats.onrender.com'

// 차트 데이터 시각화에 사용할 색상 배열
const COLORS = ['#4285F4', '#FF007F', '#00CC66', '#FF8800', '#9933CC']

// 포지션별 레이더 차트 렌더링을 위한 스탯 항목 및 정규화용 최대치 설정
const CHART_CONFIG = {
  "G": {
    label: "GK", keys: [
      { label: 'Saves', key: 'saves', max: 5.0, maxTotal: 30 },
      { label: 'Save%', key: 'savePercentage', max: 100, maxTotal: 100 },
      { label: 'Pass%', key: 'accuratePassesPercentage', max: 100, maxTotal: 100 },
      { label: 'Long%', key: 'accurateLongBallsPercentage', max: 70, maxTotal: 70 },
      { label: 'Aerials', key: 'highClaims', max: 2.0, maxTotal: 20 },
      { label: 'Runs out', tableLabel: 'RO', key: 'runsOut', max: 2.0, maxTotal: 20 },
      { label: 'Goals Conceded', tableLabel: 'GC', key: 'goalsConceded', max: 1.5, maxTotal: 10, inverted: true }
    ]
  },
  "D": {
    label: "DF", keys: [
      { label: 'Tackles', key: 'tacklesWon', max: 3.0, maxTotal: 20, maxTeam: 20 },
      { label: 'Interceptions', tableLabel: 'Intercepts', key: 'interceptions', max: 4.0, maxTotal: 25, maxTeam: 25 },
      { label: 'Clearances', key: 'clearances', max: 6.0, maxTotal: 45, maxTeam: 30 },
      { label: 'Passes', key: 'accuratePasses', max: 70.0, maxTotal: 500, maxTeam: 20 },
      { label: 'Long%', key: 'accurateLongBallsPercentage', max: 70, maxTotal: 70 },
      { label: 'Aerial duels', tableLabel: 'ADs', key: 'aerialDuelsWon', max: 2.0, maxTotal: 10, maxTeam: 50 },
      { label: 'Aerial duel%', key: 'aerialDuelsWonPercentage', max: 80, maxTotal: 80 }
    ]
  },
  "M": {
    label: "MF", keys: [
      { label: 'Key passes', tableLabel: 'KP', key: 'keyPasses', max: 4.0, maxTotal: 25, maxTeam: 50 },
      { label: 'Pass%', key: 'accuratePassesPercentage', max: 100, maxTotal: 100 },
      { label: 'Assists', key: 'assists', max: 0.6, maxTotal: 5, maxTeam: 50 },
      { label: 'Shots on target', tableLabel: 'SoT', key: 'shotsOnTarget', max: 2.5, maxTotal: 15, maxTeam: 50 },
      { label: 'Dribbles', key: 'successfulDribbles', max: 4.0, maxTotal: 20, maxTeam: 50 },
      { label: 'Duels', key: 'duelsWon', max: 10.0, maxTotal: 70, maxTeam: 30 },
      { label: 'Tackles', key: 'tacklesWon', max: 4.0, maxTotal: 20, maxTeam: 30 }
    ]
  },
  "F": {
    label: "FW", keys: [
      { label: 'Goals', key: 'goals', max: 1.2, maxTotal: 8, maxTeam: 60 },
      { label: 'Shots on target', tableLabel: 'SoT', key: 'shotsOnTarget', max: 2.5, maxTotal: 15, maxTeam: 50 },
      { label: 'Assists', key: 'assists', max: 0.5, maxTotal: 5, maxTeam: 50 },
      { label: 'Key passes', tableLabel: 'KP', key: 'keyPasses', max: 4.0, maxTotal: 25, maxTeam: 50 },
      { label: 'Passes', key: 'accuratePasses', max: 70.0, maxTotal: 500, maxTeam: 20 },
      { label: 'Was fouled', tableLabel: 'Fouled', key: 'wasFouled', max: 4.0, maxTotal: 30, maxTeam: 35 },
      { label: 'Dribbles', key: 'successfulDribbles', max: 5.0, maxTotal: 30, maxTeam: 60 }
    ]
  },
  "ALL": {
    label: "ALL", keys: [
      { label: 'G+A', key: 'goalsAssists', max: 1.5, maxTotal: 10, maxTeam: 60 },
      { label: 'Goals', key: 'goals', max: 1.2, maxTotal: 8, maxTeam: 60 },
      { label: 'Shots on target', tableLabel: 'SoT', key: 'shotsOnTarget', max: 2.5, maxTotal: 15, maxTeam: 50 },
      { label: 'Assists', key: 'assists', max: 0.5, maxTotal: 5, maxTeam: 50 },
      { label: 'Key passes', tableLabel: 'KP', key: 'keyPasses', max: 4.0, maxTotal: 25, maxTeam: 50 },
      { label: 'Passes', key: 'accuratePasses', max: 70.0, maxTotal: 500, maxTeam: 20 },
      { label: 'Was fouled', key: 'wasFouled', max: 4.0, maxTotal: 30, maxTeam: 35 },
      { label: 'Dribbles', key: 'successfulDribbles', max: 5.0, maxTotal: 35, maxTeam: 60 },
      { label: 'Duels', key: 'duelsWon', max: 10.0, maxTotal: 70, maxTeam: 30 },
      { label: 'Tackles', key: 'tacklesWon', max: 3.0, maxTotal: 20, maxTeam: 20 },
      { label: 'Interceptions', tableLabel: 'Intercepts', key: 'interceptions', max: 4.0, maxTotal: 25, maxTeam: 25 },
      { label: 'Clearances', key: 'clearances', max: 6.0, maxTotal: 45, maxTeam: 30 },
    ]
  }
}

function RadarView({ onBack, initialPlayer }) {
  // 상태 관리: 검색어, 검색 결과, 선택된 선수 목록
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedItems, setSelectedItems] = useState([])

  // 상태 관리: 포지션 뷰 모드 및 데이터 계산 방식
  const [viewMode, setViewMode] = useState('ALL')
  const [calcMode, setCalcMode] = useState('per90')

  // DOM 접근 참조: 스크린샷 캡처용
  const dashboardRef = useRef(null)

  // 현재 뷰 모드에 따른 설정 캐싱
  const activeConfig = useMemo(() => CHART_CONFIG[viewMode] || CHART_CONFIG['ALL'], [viewMode])

  // 디바운싱을 적용한 선수 검색 기능
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setSearchResults([])
        return
      }
      try {
        const res = await axios.get(`${API_BASE_URL}/api/search?q=${query}&type=player`)
        const filteredResults = res.data.filter(p => {
          if (viewMode === 'ALL') return true
          return p.position === viewMode
        })
        setSearchResults(filteredResults)
      } catch (e) {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, viewMode])

  // 초기 렌더링 시 전달받은 선수 데이터 처리
  useEffect(() => {
    if (initialPlayer) {
      if (initialPlayer.position && ['G', 'D', 'M', 'F'].includes(initialPlayer.position)) {
        setViewMode(initialPlayer.position)
      } else {
        setViewMode('ALL')
      }
      addItem(initialPlayer)
    }
  }, [initialPlayer])

  // 포지션 모드 변경 시 상태 초기화 핸들러
  const handleModeChange = useCallback((mode) => {
    setViewMode(mode)
    setSelectedItems([])
    setQuery('')
    setSearchResults([])
    if (mode === 'G') {
      setCalcMode('per90')
    }
  }, [])

  // 검색 결과에서 선수 선택 시 스탯 데이터를 Fetch하여 상태에 추가
  const addItem = useCallback(async (item) => {
    // 중복 추가 방지 검증 로직
    if (selectedItems.find(i => i.displayId === item.id)) {
      setSearchResults([])
      setQuery('')
      return
    }

    try {
      const resPlayer = await axios.get(`${API_BASE_URL}/api/stats`, { params: { year: item.year, team: item.team, filename: item.filename } })
      const resTeam = await axios.get(`${API_BASE_URL}/api/team_stats`, { params: { year: item.year, team: item.team } })
      
      const newItem = {
        ...resPlayer.data,
        teamStats: resTeam.data.stats,
        displayId: item.id || Date.now() + Math.random()
      }
      
      setSelectedItems(prev => {
        if (prev.find(i => i.displayId === newItem.displayId || (i.meta && i.meta.name === item.name))) {
          return prev
        }
        newItem.color = COLORS[prev.length % COLORS.length]
        return [...prev, newItem]
      })
    } catch (e) {
      alert("데이터 로드에 실패했습니다.")
    }
    setSearchResults([])
    setQuery('')
  }, [selectedItems])

  // 배열에서 특정 선수 데이터 제거
  const removeItem = useCallback((id) => {
    setSelectedItems(prev => prev.filter(item => item.displayId !== id))
  }, [])

  // 지정된 계산 모드에 따라 원시 스탯 데이터를 변환 및 정규화
  const calculateStat = useCallback((item, keyConfig) => {
    const stats = item.stats || {}
    const tStats = item.teamStats || {}
    const mins = stats.minutesPlayed || 1

    let raw = 0
    let isPercentage = false

    const PERCENTAGE_KEYS = [
      'accurateLongBallsPercentage',
      'accuratePassesPercentage',
      'successfulDribblesPercentage',
      'accurateCrossesPercentage',
      'aerialDuelsWonPercentage',
      'tacklesWonPercentage',
      'duelsWonPercentage'
    ]

    // 예외 스탯 계산 로직
    if (keyConfig.key === 'savePercentage') {
      const saves = stats.saves || 0
      const conceded = stats.goalsConceded || 0
      const totalShots = saves + conceded
      if (totalShots > 0) raw = (saves / totalShots) * 100
      isPercentage = true
    } else if (keyConfig.key === 'goalsAssists') {
      raw = (stats.goals || 0) + (stats.assists || 0)
    } else if (PERCENTAGE_KEYS.includes(keyConfig.key)) {
      raw = stats[keyConfig.key] || 0
      isPercentage = true
    } else {
      raw = stats[keyConfig.key] || 0
      if (keyConfig.key === 'tacklesWon') raw = stats.tacklesWon || stats.tackles || 0
      if (keyConfig.key === 'duelsWon') raw = stats.totalDuelsWon || stats.duelsWon || 0
    }

    let finalVal = 0
    let maxLimit = keyConfig.max || 100

    // 계산 모드 분기 처리
    if (isPercentage) {
      finalVal = raw
      maxLimit = keyConfig.max
    } else if (calcMode === 'per90') {
      finalVal = (raw / mins) * 90
      maxLimit = keyConfig.max
    } else if (calcMode === 'total') {
      finalVal = raw
      maxLimit = keyConfig.maxTotal || (keyConfig.max * 10)
    } else if (calcMode === 'team_pct') {
      let teamVal = tStats[keyConfig.key] || 0

      if (keyConfig.key === 'goalsAssists') {
        teamVal = (tStats.goals || 0) + (tStats.assists || 0)
      } else if (keyConfig.key === 'tacklesWon') {
        teamVal = tStats.tacklesWon || tStats.tackles || 0
      } else if (keyConfig.key === 'duelsWon') {
        teamVal = tStats.totalDuelsWon || tStats.duelsWon || 0
      }

      if (teamVal === 0) teamVal = 1
      finalVal = (raw / teamVal) * 100
      maxLimit = keyConfig.maxTeam || 100
    }

    return { val: finalVal, max: maxLimit, isPercentage }
  }, [calcMode])

  // 화면 출력용 스탯 데이터 포맷팅 함수
  const formatStatValue = useCallback((val, isPercentage) => {
    if (calcMode === 'total' && !isPercentage) {
      return Math.round(val).toString()
    }
    return val.toFixed(2)
  }, [calcMode])

  // 화면 영역 캡처 및 이미지 다운로드 핸들러
  const handleScreenshot = useCallback(async () => {
    if (!dashboardRef.current) return

    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      })

      const image = canvas.toDataURL("image/png")
      const link = document.createElement('a')
      link.href = image
      link.download = `football_comparison_${Date.now()}.png`
      link.click()
    } catch (err) {
      alert("캡처 중 오류가 발생했습니다.")
    }
  }, [])

  // Recharts 라이브러리 입력 형식에 맞춘 차트 데이터 객체 생성
  const chartData = useMemo(() => {
    if (selectedItems.length === 0) {
      return activeConfig.keys.map(k => ({
        subject: k.label,
        fullMark: 100,
        placeholder: 100
      }))
    }

    return activeConfig.keys.map(k => {
      const dataPoint = { subject: k.label, fullMark: 100 }

      selectedItems.forEach(item => {
        const { val, max, isPercentage } = calculateStat(item, k)

        let score = 0
        if (k.inverted) {
          score = Math.max(0, ((max - val) / max) * 100)
        } else {
          score = Math.min(100, (val / max) * 100)
        }

        dataPoint[item.displayId] = score

        let displayVal = formatStatValue(val, isPercentage)
        if (isPercentage || calcMode === 'team_pct') {
          displayVal += '%'
        }
        dataPoint[`${item.displayId}_raw`] = displayVal
      })
      return dataPoint
    })
  }, [selectedItems, activeConfig, calculateStat, formatStatValue, calcMode])

  return (
    <div className="radar-view fade-in">
      {/* 상단 컨트롤 UI 영역 */}
      <div className="top-controls">
        <button className="back-icon-btn" onClick={onBack}>
          <img src={backIcon} alt="Back" />
        </button>

        <div className="search-container">
          <div className="input-group">
            <input
              placeholder={`Search ${CHART_CONFIG[viewMode]?.label || 'All'} players...`}
              value={query} 
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="plus-btn">+</button>
          </div>
          {searchResults.length > 0 && (
            <div className="dropdown">
              {searchResults.map(p => (
                <div key={p.id} className="dropdown-item" onClick={() => addItem(p)}>
                  <strong>{p.name}</strong> <span>{p.team} • {p.year}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="right-controls-group">
          <div className="calc-toggles">
            {['total', 'per90', 'team_pct']
              .filter(m => !(viewMode === 'G' && m === 'team_pct'))
              .map(m => (
                <button
                  key={m}
                  className={calcMode === m ? 'active' : ''}
                  onClick={() => setCalcMode(m)}
                >
                  {m === 'team_pct' ? 'Team %' : m === 'per90' ? 'Per 90' : 'Total'}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* 차트 및 테이블 대시보드 영역 */}
      <div className="dashboard-card">
        <div className="capture-area" ref={dashboardRef} style={{ backgroundColor: '#ffffff', paddingBottom: '10px' }}>
          
          {selectedItems.length > 0 && (
            <div className="comparison-table-container">
              <div className={`comparison-table ${viewMode === 'ALL' ? 'all-mode' : ''}`}>
                <div className="table-row table-header">
                  <div className="col-name">Player</div>
                  <div className="col-stat">Mins</div>
                  {activeConfig.keys.map(k => (
                    <div key={k.key} className="col-stat">
                      {k.tableLabel || k.label}
                    </div>
                  ))}
                  <div className="col-remove"></div>
                </div>

                {selectedItems.map((item) => (
                  <div key={item.displayId} className="table-row">
                    <div className="col-name">
                      <span className="dot" style={{ background: item.color }}></span>
                      <div className="name-wrapper">
                        <span className="p-name">{item.meta.name}</span>
                        <span className="p-sub">{item.meta.year} • {item.meta.team}</span>
                      </div>
                    </div>
                    <div className="col-stat mins">
                      {item.stats.minutesPlayed || '-'}
                    </div>
                    {activeConfig.keys.map(k => {
                      const { val, isPercentage } = calculateStat(item, k)
                      return (
                        <div key={k.key} className="col-stat">
                          {formatStatValue(val, isPercentage)}
                          {(isPercentage || calcMode === 'team_pct') ? '%' : ''}
                        </div>
                      )
                    })}
                    <div className="col-remove">
                      <button className="remove-btn" onClick={() => removeItem(item.displayId)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={450}>
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                <PolarGrid stroke="#e0e0e0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 12, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />

                {selectedItems.map(item => (
                  <Radar
                    key={item.displayId}
                    name={`${item.meta.name} (${item.meta.year})`}
                    dataKey={item.displayId}
                    stroke={item.color}
                    fill={item.color}
                    fillOpacity={0.15}
                    strokeWidth={3}
                  />
                ))}

                {selectedItems.length === 0 && (
                  <Radar
                    dataKey="placeholder"
                    stroke="none"
                    fill="none"
                  />
                )}

                {selectedItems.length > 0 && (
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value, name, props) => {
                      const rawKey = `${props.dataKey}_raw`
                      return [props.payload[rawKey] || value, name]
                    }}
                  />
                )}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 하단 포지션 전환 버튼 영역 */}
        <div className="position-toggles">
          {['G', 'D', 'M', 'F', 'ALL'].map(mode => (
            <button
              key={mode}
              className={viewMode === mode ? 'active' : ''}
              onClick={() => handleModeChange(mode)}
            >
              {mode === 'G' ? 'GK' : mode === 'D' ? 'DF' : mode === 'M' ? 'MF' : mode === 'F' ? 'FW' : mode}
            </button>
          ))}

          <button className="screenshot-btn bottom-right" onClick={handleScreenshot} title="Save as Image">
            <img src={cameraIcon} alt="Screenshot" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default RadarView