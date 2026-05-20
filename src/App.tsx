import { Router, Route } from '@solidjs/router'

import Home from './pages/Home'
import Country from './pages/Country'

function App() {
    return (
        <Router base={ import.meta.env.BASE_URL.replace(/\/$/, '') }>
            <Route path="/" component={ Home } />
            <Route path="/country/:code" component={ Country } />
        </Router>
    )
}

export default App
