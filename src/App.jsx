import React, { useRef } from 'react'
import {
  RecoilRoot,
  atom,
  selector,
  selectorFamily,
  useRecoilValue,
  useSetRecoilState,
  useRecoilCallback,
} from 'recoil'
import produce from 'immer'
import { faker } from '@faker-js/faker'
import ContentEditable from 'react-contenteditable'

let n = 0
const makeId = () => `${n++}`

const RootId = Symbol('RootId')
const initialValue = {
  [RootId]: {
    childIds: [],
  },
}

const HEADINGS = 50

for (let h = 0; h < HEADINGS; h++) {
  const id = makeId()
  initialValue[RootId].childIds.push(id)

  initialValue[id] = { id, type: 'heading', text: faker.lorem.sentence() }

  const PARAGRAPHS = Math.random() * (10 - 3) + 3
  for (let p = 0; p < PARAGRAPHS; p++) {
    const id = makeId()
    initialValue[RootId].childIds.push(id)
    initialValue[id] = { id, type: 'paragraph', text: faker.lorem.paragraph() }
  }
}

const Value = atom({
  key: 'Value',
  default: initialValue,
})
const RootChildIds = selector({
  key: 'RootChildIds',
  get: ({ get }) => {
    const value = get(Value)
    const root = value[RootId]
    return root.childIds
  },
})
const Elements = selectorFamily({
  key: 'Elements',
  get:
    (id) =>
    ({ get }) =>
      get(Value)[id],
})

const getElementIndex = (snapshot, id) => {
  const value = snapshot.getLoadable(Value).contents
  const root = value[RootId]
  const childIds = root.childIds
  const index = childIds.indexOf(id)

  return index
}

const useEditorActions = () => {
  const setValue = useSetRecoilState(Value)

  const setNodes = useRecoilCallback(
    ({ snapshot }) =>
      ({ text }, id) => {
        setValue(
          produce((draft) => {
            draft[id].text = text
          })
        )
      },
    []
  )

  const insertNodes = useRecoilCallback(
    ({ snapshot }) =>
      (element, index) => {
        setValue(
          produce((draft) => {
            draft[RootId].childIds.splice(index, 0, element.id)
            draft[element.id] = element
          })
        )
      },
    []
  )

  const removeNodes = useRecoilCallback(
    ({ snapshot }) =>
      (id, index) => {
        setValue(
          produce((draft) => {
            draft[RootId].childIds.splice(index, 1)
            delete draft[id]
          })
        )
      },
    []
  )

  const actions = {
    setNodes,
    insertNodes,
    removeNodes,
  }

  window.actions = actions

  return actions
}

const ElementComponent = React.memo(({ id }) => {
  const ref = useRef()
  const element = useRecoilValue(Elements(id))
  const { setNodes, insertNodes, removeNodes } = useEditorActions()

  return (
    <ContentEditable
      data-element-id={element.id}
      innerRef={ref}
      html={element.text}
      onChange={(e) => setNodes({ text: e.target.value }, id)}
      tagName={element.type === 'heading' ? 'h1' : 'p'}
      onKeyDown={useRecoilCallback(({ snapshot, set }) => (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          const index = getElementIndex(snapshot, id)

          insertNodes({ id: makeId(), type: 'paragraph', text: '' }, index + 1)

          Promise.resolve().then(() => ref.current.nextSibling.focus())
          return
        }

        if (e.key === 'Backspace') {
          if (ref.current.innerHTML === '') {
            e.preventDefault()
            const previousSibling = ref.current.previousSibling
            if (previousSibling) {
              previousSibling.focus()

              const range = document.createRange()
              range.selectNodeContents(previousSibling)
              range.collapse(false)

              const selection = window.getSelection()
              selection.removeAllRanges()
              selection.addRange(range)

              const index = getElementIndex(snapshot, id)
              removeNodes(id, index)
            }
          }
        }

        if (e.metaKey && e.key === 'z') {
          if (e.shiftKey) {
          } else {
          }
        }
      })}
    />
  )
})

const EditorComponent = () => {
  const ids = useRecoilValue(RootChildIds)

  return (
    <div>
      {ids.map((id) => {
        return <ElementComponent key={id} id={id} />
      })}
    </div>
  )
}

const App = () => {
  return (
    <RecoilRoot>
      <EditorComponent />
    </RecoilRoot>
  )
}

export default App
