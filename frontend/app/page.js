import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function Home() {
  // Check if user has a token (logged in)
  const cookieStore = cookies()
  const token = cookieStore.get('token')
  
  if (token) {
    // User is logged in, redirect to dashboard
    redirect('/dashboard')
  } else {
    // User is not logged in, redirect to login
    redirect('/login')
  }
}