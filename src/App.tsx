import { Router, Route } from '@solidjs/router'

import Home from './pages/Home'
import Country from './pages/Country'
import Vs from './pages/Vs'

function App() {
    return (
        <Router base={ import.meta.env.BASE_URL.replace(/\/$/, '') }>
            <Route path="/" component={ Home } />
            <Route path="/country/:code" component={ Country } />
            <Route path="/vs" component={ Vs } />
            <Route path="/vs/:left" component={ Vs } />
            <Route path="/vs/:left/:right" component={ Vs } />
        </Router>
    )
}

export default App
