import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import './ScatterView.css'
import backIcon from '../../assets/icon_back.png'

// 백엔드 서버 주소
const API_BASE_URL = 'https://worldcupstats.onrender.com'

// 포지션별 스캐터 차트 X축/Y축 선택을 위한 스탯 항목 옵션 정의
const POSITION_STAT_OPTIONS = {
  "ALL": [
    { label: 'Goals', key: 'goals' },
    { label: 'Assists', key: 'assists' },
    { label: 'Shots on target', key: 'shotsOnTarget' },
    { label: 'Key passes', key: 'keyPasses' },
    { label: 'Passes', key: 'accuratePasses' },
    { label: 'Was Fouled', key: 'wasFouled' },
    { label: 'Dribbles', key: 'successfulDribbles' },
    { label: 'Duels Won', key: 'totalDuelsWon' },
    { label: 'Tackles won', key: 'tacklesWon' },
    { label: 'Interceptions', key: 'interceptions' },
  ],
  "F": [
    { label: 'Goals', key: 'goals' },
    { label: 'Assists', key: 'assists'},
    { label: 'Shots on target', key: 'shotsOnTarget' },
    { label: 'Key passes', key: 'keyPasses' },
    { label: 'Passes', key: 'accuratePasses' },
    { label: 'Was fouled', key: 'wasFouled' },
    { label: 'Dribbles', key: 'successfulDribbles' }
  ],
  "M": [
    { label: 'Assists', key: 'assists' },
    { label: 'Key passes',  key: 'keyPasses' },
    { label: 'Pass%', key: 'accuratePassesPercentage' },
    { label: 'Shots on target', key: 'shotsOnTarget' },
    { label: 'Dribbles', key: 'successfulDribbles' },
    { label: 'Duels Won', key: 'totalDuelsWon' },
    { label: 'Tackles won', key: 'tacklesWon' },
  ],
  "D": [
    { label: 'Tackles won', key: 'tacklesWon' },
    { label: 'Interceptions', key: 'interceptions' },
    { label: 'Clearances', key: 'clearances' },
    { label: 'Passes', key: 'accuratePasses' },
    { label: 'Long%', key: 'accurateLongBallsPercentage' },
    { label: 'Aerial duels', key: 'aerialDuelsWon' },
    { label: 'Aerial duel%', key: 'aerialDuelsWonPercentage' }
  ],
  "G": [
    { label: 'Saves', key: 'saves' },
    { label: 'Save%', key: 'savePercentage' },
    { label: 'Pass%', key: 'accuratePassesPercentage' },
    { label: 'Long%', key: 'accurateLongBallsPercentage' },
    { label: 'Aerials', key: 'highClaims' },
    { label: 'Runs out', key: 'runsOut' },
    { label: 'Goals Conceded', key: 'goalsConceded' }
  ]
}

// 필터링 옵션 정의
const YEARS = [
  'ALL', '2022', '2018', '2014', '2010', '2006', '2002',
  '1998', '1994', '1990', '1986', '1982', '1978', '1974', '1970', '1966'
]
const POSITIONS = [
  { label: 'All Positions', value: 'ALL' },
  { label: 'Forward', value: 'F' },
  { label: 'Midfielder', value: 'M' },
  { label: 'Defender', value: 'D' },
  { label: 'Goalkeeper', value: 'G' }
]

// 역방향 축(낮을수록 좋은 스탯) 설정
const INVERTED_STATS = ['goalsConceded']

// 해당 키가 백분율 데이터인지 판별하는 유틸리티 함수
const isPct = (key) => key.toLowerCase().includes('percentage')

function ScatterView({ onBack, onPlayerClick }) {
  // 상태 관리: 필터링 조건
  const [year, setYear] = useState('2022')
  const [position, setPosition] = useState('F')
  const [xAxis, setXAxis] = useState('goals')
  const [yAxis, setYAxis] = useState('assists')
  const [calcMode, setCalcMode] = useState('per90')
  const [min300Mins, setMin300Mins] = useState(false)

  // 상태 관리: 차트 데이터 및 로딩 상태
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  // 선택된 포지션에 따른 드롭다운 옵션 캐싱
  const currentOptions = useMemo(() => POSITION_STAT_OPTIONS[position] || POSITION_STAT_OPTIONS['ALL'], [position])

  // 포지션 변경 시 X축, Y축 스탯 선택 초기화 및 업데이트 핸들러
  const handlePositionChange = useCallback((e) => {
    const newPos = e.target.value
    setPosition(newPos)

    const newOptions = POSITION_STAT_OPTIONS[newPos] || POSITION_STAT_OPTIONS['ALL']
    const validKeys = newOptions.map(opt => opt.key)

    if (!validKeys.includes(xAxis)) setXAxis(validKeys[0])
    if (!validKeys.includes(yAxis)) setYAxis(validKeys[1] || validKeys[0])
  }, [xAxis, yAxis])

  // 설정된 조건(연도, 포지션, 축 등)에 맞춰 백엔드에서 데이터 Fetch 및 정제
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/api/scatter_data`, {
        params: { year }
      })

      // 포지션 및 최소 출전 시간(300분) 필터링
      const filtered = res.data.filter(p => {
        const posMatch = position === 'ALL' || p.position === position
        const minMatch = !min300Mins || p.minutes >= 300
        return posMatch && minMatch
      })

      // Recharts 포맷에 맞춰 데이터 매핑 및 계산(Per90/Total) 적용
      const formattedData = filtered.map(player => {
        let xVal = player[xAxis] || 0
        if (xAxis === 'goalsAssists') {
          xVal = (player.goals || 0) + (player.assists || 0)
        } else if (xAxis === 'savePercentage') {
          const totalShotsX = (player.saves || 0) + (player.goalsConceded || 0)
          xVal = totalShotsX > 0 ? (player.saves / totalShotsX) * 100 : 0
        }

        let yVal = player[yAxis] || 0
        if (yAxis === 'goalsAssists') {
          yVal = (player.goals || 0) + (player.assists || 0)
        } else if (yAxis === 'savePercentage') {
          const totalShotsY = (player.saves || 0) + (player.goalsConceded || 0)
          yVal = totalShotsY > 0 ? (player.saves / totalShotsY) * 100 : 0
        }

        const excludeFromPer90 = [
          'minutes', 
          'rating', 
          'savePercentage', 
          'accuratePassesPercentage', 
          'accurateLongBallsPercentage',
          'aerialDuelsWonPercentage'
        ]

        // 90분당 스탯 환산 적용
        if (calcMode === 'per90') {
          if (!excludeFromPer90.includes(xAxis) && player.minutes > 0) {
            xVal = (xVal / player.minutes) * 90
          }
          if (!excludeFromPer90.includes(yAxis) && player.minutes > 0) {
            yVal = (yVal / player.minutes) * 90
          }
        }

        return {
          name: player.name,
          team: player.team,
          year: player.year,
          filename: player.filename,
          id: player.id,
          x: Number(xVal.toFixed(2)),
          y: Number(yVal.toFixed(2)),
          rawMinutes: player.minutes
        }
      }).filter(item => item.x !== 0 && item.y !== 0)

      setData(formattedData)
    } catch (e) {
      console.error("데이터 로드 실패", e)
    }
    setLoading(false)
  }, [year, position, xAxis, yAxis, calcMode, min300Mins])

  // 의존성 배열의 값이 변경될 때마다 데이터 다시 불러오기
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 커스텀 툴팁 렌더링 함수
  const renderTooltip = useCallback(({ active, payload }) => {
    if (active && payload && payload.length) {
      const tooltipData = payload[0].payload
      const xLabel = currentOptions.find(opt => opt.key === xAxis)?.label || xAxis
      const yLabel = currentOptions.find(opt => opt.key === yAxis)?.label || yAxis
      const suffix = calcMode === 'per90' ? ' (p90)' : ''
      const excludeFromPer90 = [
          'minutes', 
          'rating', 
          'savePercentage', 
          'accuratePassesPercentage', 
          'accurateLongBallsPercentage',
          'aerialDuelsWonPercentage'
        ]

      return (
        <div className="scatter-tooltip">
          <p className="st-name"><strong>{tooltipData.name}</strong> <span className="st-team">({tooltipData.team}, {tooltipData.year})</span></p>
          <p className="st-stat">{xLabel}{!excludeFromPer90.includes(xAxis) ? suffix : ''}: <strong>{tooltipData.x}</strong></p>
          <p className="st-stat">{yLabel}{!excludeFromPer90.includes(yAxis) ? suffix : ''}: <strong>{tooltipData.y}</strong></p>
          <p className="st-mins">Mins: {tooltipData.rawMinutes}</p>
        </div>
      )
    }
    return null
  }, [currentOptions, xAxis, yAxis, calcMode])

  return (
    <div className="scatter-view fade-in">
      <div className="top-controls">
        <button className="back-icon-btn" onClick={onBack}>
          <img src={backIcon} alt="Back" />
        </button>

        {/* 상단 필터링 및 축 선택 UI */}
        <div className="selectors-container">
          <div className="axis-selector">
            <label>Year</label>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="axis-selector">
            <label>Position</label>
            <select value={position} onChange={handlePositionChange}>
              {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <span className="divider">|</span>

          <div className="axis-selector">
            <label>x-axis</label>
            <select value={xAxis} onChange={(e) => setXAxis(e.target.value)}>
              {currentOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
            </select>
          </div>

          <div className="axis-selector">
            <label>y-axis</label>
            <select value={yAxis} onChange={(e) => setYAxis(e.target.value)}>
              {currentOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        {/* 우측 계산 모드 토글 (Total / Per 90) */}
        <div className="right-controls-group">
          <div className="calc-toggles">
            <button
              className={calcMode === 'total' ? 'active' : ''}
              onClick={() => setCalcMode('total')}
            >
              Total
            </button>
            <button
              className={calcMode === 'per90' ? 'active' : ''}
              onClick={() => setCalcMode('per90')}
            >
              Per 90
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-card scatter-card">
        {/* 최소 출전 시간 필터링 스위치 */}
        <div className="min-mins-toggle">
          <span className="toggle-label">≥ 300 mins played</span>
          <label className="switch">
            <input type="checkbox" checked={min300Mins} onChange={(e) => setMin300Mins(e.target.checked)} />
            <span className="slider round"></span>
          </label>
        </div>

        {/* 로딩/빈 상태/차트 렌더링 분기 */}
        {loading ? (
          <div className="loading">데이터를 불러오는 중입니다...</div>
        ) : data.length === 0 ? (
          <div className="empty-overlay">
            <p>해당 조건의 선수 데이터가 없습니다.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={600}>
            <ScatterChart margin={{ top: 40, right: 40, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.5} vertical={false} />
              
              {/* X축 설정 및 라벨링 */}
              <XAxis 
                type="number" 
                dataKey="x" 
                name={xAxis} 
                tick={{ fill: '#7f8c8d', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e0e0e0' }}
                domain={isPct(xAxis) ? [0, 100] : [dataMin => Math.max(0, Math.floor(dataMin * 2) / 2 - 1), dataMax => Math.ceil(dataMax * 2) / 2]}
                ticks={isPct(xAxis) ? [0, 20, 40, 60, 80, 100] : undefined}
                reversed={INVERTED_STATS.includes(xAxis)}
                label={{ 
                  value: currentOptions.find(opt => opt.key === xAxis)?.label || xAxis, 
                  position: 'insideBottomRight', 
                  dy: 20,
                  fill: '#2c3e50', 
                  fontSize: 13,
                  fontWeight: 'normal'
                }}
              />
              
              {/* Y축 설정 및 라벨링 */}
              <YAxis 
                type="number" 
                dataKey="y" 
                name={yAxis} 
                tick={{ fill: '#7f8c8d', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e0e0e0' }}
                domain={isPct(yAxis) ? [0, 100] : [dataMin => Math.max(0, Math.floor(dataMin * 2) / 2 - 1), dataMax => Math.ceil(dataMax * 2) / 2]}
                ticks={isPct(yAxis) ? [0, 20, 40, 60, 80, 100] : undefined}
                reversed={INVERTED_STATS.includes(yAxis)}
                label={{ 
                  value: currentOptions.find(opt => opt.key === yAxis)?.label || yAxis, 
                  position: 'top', 
                  offset: 20, 
                  fill: '#2c3e50', 
                  fontSize: 13,
                  fontWeight: 'normal'
                }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3', stroke: '#ccc' }} content={renderTooltip} />

              {/* 데이터 포인트 렌더링 및 클릭 이벤트 (레이더 뷰 연결) */}
              <Scatter 
                name="Players" 
                data={data} 
                fill="#4285F4" 
                fillOpacity={0.6} 
                shape="circle" 
                cursor="pointer"
                onClick={(playerData) => {
                  if (onPlayerClick) {
                    onPlayerClick(playerData)
                  }
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default ScatterView