import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface AccessibilityContextType {
  isKeyboardNavigation: boolean
  isHighContrast: boolean
  isReducedMotion: boolean
  announceMessage: (message: string, priority?: 'polite' | 'assertive') => void
  setKeyboardNavigation: (enabled: boolean) => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

interface AccessibilityProviderProps {
  children: ReactNode
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false)
  const [isHighContrast, setIsHighContrast] = useState(false)
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [liveRegion, setLiveRegion] = useState<HTMLDivElement | null>(null)

  // Detect keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setIsKeyboardNavigation(true)
        document.body.classList.add('keyboard-nav-active')
      }
    }

    const handleMouseDown = () => {
      setIsKeyboardNavigation(false)
      document.body.classList.remove('keyboard-nav-active')
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // Detect high contrast mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches)
    }

    setIsHighContrast(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches)
    }

    setIsReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // Create live region for screen reader announcements
  useEffect(() => {
    const region = document.createElement('div')
    region.setAttribute('aria-live', 'polite')
    region.setAttribute('aria-atomic', 'true')
    region.className = 'live-region sr-only'
    region.id = 'live-region'
    document.body.appendChild(region)
    setLiveRegion(region)

    return () => {
      if (region.parentNode) {
        region.parentNode.removeChild(region)
      }
    }
  }, [])

  const announceMessage = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegion) return

    liveRegion.setAttribute('aria-live', priority)
    liveRegion.textContent = message

    // Clear the message after a short delay to allow for re-announcements
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = ''
      }
    }, 1000)
  }

  const setKeyboardNavigationState = (enabled: boolean) => {
    setIsKeyboardNavigation(enabled)
    if (enabled) {
      document.body.classList.add('keyboard-nav-active')
    } else {
      document.body.classList.remove('keyboard-nav-active')
    }
  }

  const value: AccessibilityContextType = {
    isKeyboardNavigation,
    isHighContrast,
    isReducedMotion,
    announceMessage,
    setKeyboardNavigation: setKeyboardNavigationState
  }

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

// Higher-order component for adding accessibility features
export const withAccessibility = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  const AccessibleComponent = (props: P) => {
    const { announceMessage } = useAccessibility()

    // Add announcement capability to props
    const enhancedProps = {
      ...props,
      announceMessage
    } as P & { announceMessage: (message: string, priority?: 'polite' | 'assertive') => void }

    return <Component {...enhancedProps} />
  }

  AccessibleComponent.displayName = `withAccessibility(${Component.displayName || Component.name})`
  return AccessibleComponent
}
