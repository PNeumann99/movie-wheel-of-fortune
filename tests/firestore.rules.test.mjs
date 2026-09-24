import { readFileSync } from 'node:fs'
import { after, before, test } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

let environment
let alice
let outsider

const movie = {
  title: 'Arrival',
  year: 2016,
  weight: 2,
  status: 'backlog',
  createdAt: 1,
  addedBy: 'alice',
  addedByName: 'Alice',
  genre: 'Science Fiction',
  streamingService: 'Netflix',
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-movie-wheel',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
  await environment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore()
    await setDoc(doc(firestore, 'members/alice'), { name: 'Alice' })
    await setDoc(doc(firestore, 'members/bob'), { name: 'Bob' })
    await setDoc(doc(firestore, 'movies/legacy'), {
      title: 'Old movie', year: null, weight: 1, status: 'backlog', createdAt: 0, addedBy: 'bob',
    })
  })
  alice = environment.authenticatedContext('alice').firestore()
  outsider = environment.authenticatedContext('outsider').firestore()
})

after(async () => {
  await environment?.cleanup()
})

test('members can create a movie with all required fields', async () => {
  await assertSucceeds(setDoc(doc(alice, 'movies/valid'), movie))
  await assertSucceeds(setDoc(doc(alice, 'movies/no-service'), { ...movie, streamingService: null }))
})

test('new movies require a genre and author name, and limit streaming choices', async () => {
  const { genre: _genre, ...withoutGenre } = movie
  const { addedByName: _name, ...withoutName } = movie
  await assertFails(setDoc(doc(alice, 'movies/no-genre'), withoutGenre))
  await assertFails(setDoc(doc(alice, 'movies/no-name'), withoutName))
  await assertFails(setDoc(doc(alice, 'movies/bad-service'), { ...movie, streamingService: 'Unknown' }))
  await assertFails(setDoc(doc(outsider, 'movies/nonmember'), { ...movie, addedBy: 'outsider' }))
})

test('existing movies remain editable, but the original contributor is fixed', async () => {
  await assertSucceeds(updateDoc(doc(alice, 'movies/legacy'), { status: 'watched' }))
  await assertSucceeds(updateDoc(doc(alice, 'movies/legacy'), { genre: 'Drama', streamingService: null }))
  await assertFails(updateDoc(doc(alice, 'movies/legacy'), { addedBy: 'alice' }))
  await assertFails(updateDoc(doc(alice, 'movies/legacy'), { addedByName: 'Alice' }))
})

test('members can read each other’s names while nonmembers cannot read movies', async () => {
  await assertSucceeds(getDoc(doc(alice, 'members/bob')))
  await assertFails(getDoc(doc(outsider, 'members/bob')))
  await assertFails(getDoc(doc(outsider, 'movies/legacy')))
})
