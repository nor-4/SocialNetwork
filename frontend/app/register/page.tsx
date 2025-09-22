'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {
  AuthContainer,
  AuthHeader,
  AuthCard,
  AuthInput,
  AuthButton,
  AuthSelect,
  AuthTextarea,
  AuthToggle,
} from '@/components/AuthStyles'
import ImageUpload, {ImageProps} from '@/components/ImageUpload'
import {Register} from '@/hooks/Auth'
import { useAuth } from '@/components/AuthContext'

const RegisterPage = () => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState<number | undefined>(undefined)
  const [nickname, setNickname] = useState('')
  const [about, setAbout] = useState('')
  const [imagePreview, setImagePreview] = useState<ImageProps | undefined>(undefined)
  const [isPublic, setIsPublic] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const {update} = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const resp = await Register({
        User: {
          About: about,
          Dob: dateOfBirth,
          Email: email,
          FirstName: firstName,
          Gender: gender,
          LastName: lastName,
          Nickname: nickname,
          Public: isPublic,
        },
        Password: password,
        ImageData: imagePreview?.data.replace(/.*base64,/, ''),
        ImageFilename: imagePreview?.fileName,
        ImageMimetype: imagePreview?.mimeType,
      })

      if (resp.error) {
        return setError(resp.error)
      }

      update()
      router.push('/login')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <AuthContainer>
      <AuthHeader title="Create your account" subtitle="Already have an account? Login" link="/login" />

      <AuthCard>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <AuthInput
              label="First Name"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <AuthInput
              label="Last Name"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <AuthInput
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <AuthInput
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <AuthInput
              label="Date of Birth"
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
            <AuthSelect
              label="Gender"
              id="gender"
              value={'' + gender}
              onChange={(e) => setGender(parseInt(e.target.value))}
              options={[
                {value: '', label: 'Select'},
                {value: '1', label: 'Male'},
                {value: '2', label: 'Female'},
              ]}
            />
          </div>

          <AuthInput label="Nickname" id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />

          <ImageUpload onImageChange={setImagePreview} />

          <AuthTextarea label="About Me" id="about" value={about} onChange={(e) => setAbout(e.target.value)} rows={2} />

          <AuthToggle
            checked={isPublic}
            onChange={setIsPublic}
            label={isPublic ? 'Public Profile' : 'Private Profile'}
          />

          <AuthButton type="submit">Sign Up</AuthButton>
        </form>
      </AuthCard>
    </AuthContainer>
  )
}

export default RegisterPage
