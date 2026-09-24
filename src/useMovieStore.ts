import { useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './firebase'
import type { Movie, MovieDetails } from './types'

const previewKey = 'movie-wheel-preview-v1'

const sampleMovies: Movie[] = [
  { id: 'arrival', title: 'Arrival', year: 2016, weight: 3, status: 'backlog', createdAt: 3, addedBy: 'preview' },
  { id: 'spirited-away', title: 'Spirited Away', year: 2001, weight: 2, status: 'backlog', createdAt: 2, addedBy: 'preview' },
  { id: 'grand-budapest', title: 'The Grand Budapest Hotel', year: 2014, weight: 1, status: 'backlog', createdAt: 1, addedBy: 'preview' },
]

function loadPreviewMovies(): Movie[] {
  try {
    const saved = localStorage.getItem(previewKey)
    return saved ? JSON.parse(saved) as Movie[] : sampleMovies
  } catch {
    return sampleMovies
  }
}

export function useMovieStore() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured)
  const [membershipLoading, setMembershipLoading] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [movies, setMovies] = useState<Movie[]>(() => isFirebaseConfigured ? [] : loadPreviewMovies())
  const [dataError, setDataError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthLoading(false)
      setMembershipLoading(Boolean(nextUser))
      setIsMember(false)
      setMovies([])
      setDataError(null)
    }, (error) => {
      setDataError(error.message)
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!db || !user) return
    return onSnapshot(doc(db, 'members', user.uid), (snapshot) => {
      setIsMember(snapshot.exists())
      setMembershipLoading(false)
      setDataError(null)
    }, (error) => {
      setDataError(error.message)
      setMembershipLoading(false)
    })
  }, [user])

  useEffect(() => {
    if (!db || !user || !isMember) return
    return onSnapshot(query(collection(db, 'movies'), orderBy('createdAt', 'desc')), (snapshot) => {
      setMovies(snapshot.docs.map((movieDoc) => ({ id: movieDoc.id, ...movieDoc.data() }) as Movie))
      setDataError(null)
    }, (error) => setDataError(error.message))
  }, [user, isMember])

  useEffect(() => {
    if (!isFirebaseConfigured) localStorage.setItem(previewKey, JSON.stringify(movies))
  }, [movies])

  async function signIn() {
    if (!auth) return
    await signInWithPopup(auth, new GoogleAuthProvider())
  }

  async function logOut() {
    if (!auth) return
    await signOut(auth)
  }

  async function addMovie(details: MovieDetails) {
    const movie = { ...details, status: 'backlog' as const, createdAt: Date.now(), addedBy: user?.uid ?? 'preview' }
    if (!db) {
      setMovies((current) => [{ ...movie, id: crypto.randomUUID() }, ...current])
      return
    }
    await addDoc(collection(db, 'movies'), movie)
  }

  async function updateMovie(id: string, changes: Partial<Pick<Movie, 'title' | 'year' | 'weight' | 'status'>>) {
    if (!db) {
      setMovies((current) => current.map((movie) => movie.id === id ? { ...movie, ...changes } : movie))
      return
    }
    await updateDoc(doc(db, 'movies', id), changes)
  }

  async function removeMovie(id: string) {
    if (!db) {
      setMovies((current) => current.filter((movie) => movie.id !== id))
      return
    }
    await deleteDoc(doc(db, 'movies', id))
  }

  return {
    preview: !isFirebaseConfigured,
    user,
    authLoading,
    membershipLoading,
    isMember,
    movies,
    dataError,
    signIn,
    logOut,
    addMovie,
    updateMovie,
    removeMovie,
  }
}
