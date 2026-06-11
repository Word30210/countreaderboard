import { For, JSXElement, Show, createSignal, onCleanup, onMount } from "solid-js"
import "./Dropdown.scss"

export interface DropdownOption<T extends string = string> {
    value: T
    label: string
    icon?: string
}

interface DropdownProps<T extends string = string> {
    label?: string
    placeholder?: string
    value: T
    options: DropdownOption<T>[]
    onChange: (value: T) => void
}

export default function Dropdown<T extends string = string>(props: DropdownProps<T>): JSXElement {
    const [open, setOpen] = createSignal(false)

    let buttonRef: HTMLButtonElement | undefined
    let panelRef: HTMLDivElement | undefined

    const close = () => setOpen(false)
    const toggle = () => setOpen((v) => !v)
    const pick = (value: T) => {
        props.onChange(value)
        close()
    }

    const selectedOption = () => props.options.find((o) => o.value === props.value)

    const selectedLabel = () => {
        const match = selectedOption()
        return match ? match.label : (props.placeholder ?? "")
    }

    onMount(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (!open()) return
            const target = e.target as Node
            if (panelRef?.contains(target) || buttonRef?.contains(target)) return
            close()
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") close()
        }

        document.addEventListener("mousedown", onMouseDown)
        document.addEventListener("keydown", onKeyDown)

        onCleanup(() => {
            document.removeEventListener("mousedown", onMouseDown)
            document.removeEventListener("keydown", onKeyDown)
        })
    })

    return <div class="dropdown">
        <Show when={ props.label }>
            <label class="dropdown-label">{ props.label }</label>
        </Show>

        <button
            type="button"
            class="dropdown-button"
            ref={ (el) => (buttonRef = el) }
            onClick={ toggle }
            aria-haspopup="listbox"
            aria-expanded={ open() }
        >
            <Show when={ selectedOption()?.icon }>
                { (icon) => <img class="dropdown-icon" src={ icon() } alt="" loading="lazy" /> }
            </Show>
            <span class={ `dropdown-button-text ${ !selectedOption() ? "is-placeholder" : "" }` }>{ selectedLabel() }</span>
            <span class="dropdown-caret">▼</span>
        </button>

        <Show when={ open() }>
            <div class="dropdown-panel" ref={ (el) => (panelRef = el) } role="listbox">
                <For each={ props.options }>
                    { (option) => <button
                        type="button"
                        class={ `dropdown-option ${ option.value === props.value ? "is-selected" : "" }` }
                        role="option"
                        aria-selected={ option.value === props.value }
                        onClick={ () => pick(option.value) }
                    >
                        <Show when={ option.icon }>
                            { (icon) => <img class="dropdown-icon" src={ icon() } alt="" loading="lazy" /> }
                        </Show>
                        <span class="dropdown-option-label">{ option.label }</span>
                    </button> }
                </For>
            </div>
        </Show>
    </div>
}
