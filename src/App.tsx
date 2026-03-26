import { createSignal } from 'solid-js'
import { Router, Route } from '@solidjs/router'

import Home from './pages/Home'
import About from './pages/About'

function App() {
    return (
        <Router>
            <Route path="/" component={ Home } />
            <Route path="/about" component={ About } />
        </Router>
    )
}

export default App
