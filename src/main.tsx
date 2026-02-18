import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Import FontAwesome library
import { library } from '@fortawesome/fontawesome-svg-core';
import { faTachometerAlt, faCubes, faMoneyBillAlt, faSwimmingPool, faServer, faTools, faInfo, faWallet, faExchangeAlt, faCopy, faCoins, faClock, faHashtag, faCube, faArrowLeft, faArrowRight, faDatabase, faChartLine, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

// Add icons to library
library.add(faTachometerAlt, faCubes, faMoneyBillAlt, faSwimmingPool, faServer, faTools, faInfo, faWallet, faExchangeAlt, faCopy, faCoins, faClock, faHashtag, faCube, faArrowLeft, faArrowRight, faDatabase, faChartLine, faCheckCircle);

import App from './App.tsx'
// @ts-expect-error - Error.jsx is a JavaScript React component
import ErrorLayout from './Error.jsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorLayout>
      <App />
    </ErrorLayout>
  </StrictMode>,
)
