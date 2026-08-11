import { FC, PropsWithChildren, ReactNode, useCallback, useState } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'

import { noop } from '@utils/viewUtils'

import { NavbarItemType, Sidebar, useSidebar } from '@harnessio/ui/components'
import { MainContentLayout, SidebarView } from '@harnessio/views'

import { ChatMarker, ChatPanel } from './chat-rail'
import { useRootViewWrapperStore } from './root-view-wrapper-store'

export interface AppViewWrapperProps {
  asChild?: boolean
  breadcrumbs?: ReactNode
  childrenWrapperClassName?: string
  /** Optional custom sidebar. When provided, it replaces the default app SidebarView. */
  sidebar?: ReactNode
  /** When true, the main body renders as a rounded, bordered inset panel (prod look). */
  insetBody?: boolean
}

export const AppViewWrapper: FC<PropsWithChildren<AppViewWrapperProps>> = ({
  children,
  breadcrumbs,
  childrenWrapperClassName,
  asChild = false,
  sidebar,
  insetBody = false
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [pinnedMenu, setPinnedMenu] = useState<NavbarItemType[]>([
    {
      id: 0,
      iconName: 'repository',
      title: 'Repositories',
      description: 'Integrated & familiar git experience.',
      to: '/pixel/repos',
      permanentlyPinned: true
    },
    {
      id: 1,
      iconName: 'pipeline',
      title: 'Pipelines',
      description: 'Up to 4X faster than other solutions.',
      to: '/pipelines',
      permanentlyPinned: true
    },
    {
      id: 3,
      iconName: 'database',
      title: 'Databases',
      description: 'Manage all your infrastructure.',
      to: '/databases'
    },
    {
      id: 7,
      iconName: 'portal',
      title: 'Developer Portal',
      description: 'Built for developers, onboard in minutes.',
      to: '/developer/portal'
    },
    {
      id: 32,
      iconName: 'user',
      title: 'Users',
      to: '/admin/default-settings'
    },
    {
      id: 9,
      iconName: 'engineering-insights',
      title: 'Developer Insights',
      description: 'Actionable insights on SDLC.',
      to: '/developer/insights'
    }
  ])
  const [recentMenu] = useState<NavbarItemType[]>([])
  const { moreMenu, settingsMenu } = useRootViewWrapperStore()

  const setPinned = useCallback((item: NavbarItemType, pin: boolean) => {
    setPinnedMenu(current => (pin ? [...current, item] : current.filter(pinnedItem => pinnedItem !== item)))
  }, [])

  const onToggleMoreMenu = useCallback((state?: boolean) => {
    setShowSettingsMenu(false)
    setShowMoreMenu(current => state ?? !current)
  }, [])

  const onToggleSettingsMenu = useCallback((state?: boolean) => {
    setShowMoreMenu(false)
    setShowSettingsMenu(current => state ?? !current)
  }, [])

  return (
    <Routes>
      <Route
        path="*"
        element={
          <Sidebar.Provider>
            {sidebar ?? (
              <SidebarView
                showMoreMenu={showMoreMenu}
                showSettingMenu={showSettingsMenu}
                handleMoreMenu={onToggleMoreMenu}
                handleSettingsMenu={onToggleSettingsMenu}
                currentUser={undefined}
                handleCustomNav={noop}
                handleLogOut={noop}
                recentMenuItems={recentMenu}
                pinnedMenuItems={pinnedMenu}
                handleChangePinnedMenuItem={setPinned}
                handleRemoveRecentMenuItem={noop}
                changeLanguage={noop}
                lang="en"
                moreMenu={moreMenu}
                settingsMenu={settingsMenu}
                useSidebar={useSidebar}
              />
            )}
            <Sidebar.Inset
              className={insetBody ? 'flex' : undefined}
              style={insetBody ? { backgroundColor: 'var(--cn-bg-0)' } : undefined}
            >
              {insetBody ? (
                <>
                  {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
                  <div className="relative flex min-w-0 flex-1 flex-col">
                    <ChatMarker open={chatOpen} onToggle={() => setChatOpen(open => !open)} />
                    <div
                      id="main-content-layout"
                      className={`flex min-h-0 flex-1 flex-col overflow-hidden ${childrenWrapperClassName ?? ''}`}
                      style={{
                        margin: 6,
                        borderRadius: 12,
                        border: '1px solid var(--cn-border-2)',
                        backgroundColor: 'var(--cn-bg-1)'
                      }}
                    >
                      {breadcrumbs}
                      <div className="min-h-0 flex-1 overflow-auto">
                        <Outlet />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {breadcrumbs}
                  <MainContentLayout className={childrenWrapperClassName} withBreadcrumbs>
                    <Outlet />
                  </MainContentLayout>
                </>
              )}
            </Sidebar.Inset>
          </Sidebar.Provider>
        }
      >
        {asChild ? children : <Route path="*" element={children} />}
      </Route>
    </Routes>
  )
}
