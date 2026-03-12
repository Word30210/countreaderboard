import { createSignal } from 'solid-js'
import { Router, Route } from '@solidjs/router'

import Home from './pages/Home'
import About from './pages/About'

function App(props) {
    return (
        <Router>
            <Route path="/" component={ Home } />
            <Route path="/about" component={ About } />

            {/* <div class="paper container">
                <h1>Title</h1>
            </div> */}
        </Router>
    )
}

export default App
