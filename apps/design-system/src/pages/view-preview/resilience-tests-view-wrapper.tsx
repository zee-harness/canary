import { FC, PropsWithChildren } from 'react'

import {
  Breadcrumb,
  HarnessLogo,
  IconV2,
  SearchProvider,
  Sidebar,
  SidebarSearch,
  Text,
  useSidebar
} from '@harnessio/ui/components'

import { AppViewWrapper, AppViewWrapperProps } from './app-view-wrapper'

type ResilienceNav = 'overview' | 'chaos-experiments'

const OVERVIEW_ROUTE = '/view-preview/overview'
const CHAOS_ROUTE = '/view-preview/chaos-experiments'

const ResilienceTestsSidebar = ({ activeNav }: { activeNav: ResilienceNav }) => {
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  return (
  <Sidebar.Root>
    <Sidebar.Header>
      <SearchProvider>
        <div className={`gap-cn-md flex flex-col${collapsed ? ' items-center' : ''}`}>
          <div className={`flex w-full items-center ${collapsed ? 'justify-center' : 'gap-cn-sm'}`}>
            <div className={collapsed ? 'flex items-center' : 'pl-cn-xs flex items-center'}>
              <HarnessLogo size={26} />
            </div>
            {!collapsed && (
              <>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Text variant="body-single-line-strong" truncate>
                    Project Name
                  </Text>
                  <Text variant="caption-single-line-normal" color="foreground-3" truncate>
                    Project
                  </Text>
                </div>
                <IconV2 name="nav-arrow-right" size="xs" className="text-cn-3" />
              </>
            )}
          </div>
          <SidebarSearch />
        </div>
      </SearchProvider>
    </Sidebar.Header>
    <Sidebar.Content>
      <Sidebar.Group>
        <Sidebar.Item icon="chaos-tests" title="Resilience Tests" defaultSubmenuOpen>
          <Sidebar.MenuSubItem to={OVERVIEW_ROUTE} end active={activeNav === 'overview'} title="Overview" />
          <Sidebar.MenuSubItem to={`${CHAOS_ROUTE}/insights`} title="Insights" />
          <Sidebar.MenuSubItem
            to={CHAOS_ROUTE}
            end
            active={activeNav === 'chaos-experiments'}
            title="Chaos Experiments"
          />
          <Sidebar.MenuSubItem to={`${CHAOS_ROUTE}/load-tests`} title="Load Tests" />
          <Sidebar.MenuSubItem to={`${CHAOS_ROUTE}/dr-testing`} title="DR Testing" />
          <Sidebar.MenuSubItem to={`${CHAOS_ROUTE}/settings`} title="Settings" />
        </Sidebar.Item>
      </Sidebar.Group>
    </Sidebar.Content>
    <Sidebar.Footer>
      <Sidebar.ToggleMenuButton />
    </Sidebar.Footer>
    <Sidebar.Rail />
  </Sidebar.Root>
  )
}

export interface ResilienceTestsViewWrapperProps extends Omit<AppViewWrapperProps, 'breadcrumbs' | 'sidebar'> {
  activeNav: ResilienceNav
  /** Optional leaf breadcrumb (e.g. an experiment name) shown after the module crumbs. */
  leaf?: string
}

const ResilienceTestsViewWrapper: FC<PropsWithChildren<ResilienceTestsViewWrapperProps>> = ({
  children,
  asChild,
  childrenWrapperClassName,
  activeNav,
  leaf
}) => {
  const isChaos = activeNav === 'chaos-experiments'
  const hasLeaf = Boolean(leaf)

  return (
    <AppViewWrapper
      asChild={asChild}
      childrenWrapperClassName={childrenWrapperClassName}
      insetBody
      sidebar={<ResilienceTestsSidebar activeNav={activeNav} />}
      breadcrumbs={
        <div
          className="bg-cn-1 flex items-center"
          style={{
            height: 'var(--cn-breadcrumbs-height)',
            paddingLeft: 'var(--cn-page-container-spacing-px)',
            paddingRight: 'var(--cn-page-container-spacing-px)'
          }}
        >
          <Breadcrumb.Root className="select-none">
            <Breadcrumb.List>
              <Breadcrumb.Item>
                {isChaos ? (
                  <Breadcrumb.Link href="#">Resilience Testing</Breadcrumb.Link>
                ) : (
                  <Breadcrumb.Page>Resilience Testing</Breadcrumb.Page>
                )}
              </Breadcrumb.Item>
              {isChaos && (
                <>
                  <Breadcrumb.Separator />
                  <Breadcrumb.Item>
                    {hasLeaf ? (
                      <Breadcrumb.Link href="#">Chaos Experiments</Breadcrumb.Link>
                    ) : (
                      <Breadcrumb.Page>Chaos Experiments</Breadcrumb.Page>
                    )}
                  </Breadcrumb.Item>
                </>
              )}
              {hasLeaf && (
                <>
                  <Breadcrumb.Separator />
                  <Breadcrumb.Item>
                    <Breadcrumb.Page>{leaf}</Breadcrumb.Page>
                  </Breadcrumb.Item>
                </>
              )}
            </Breadcrumb.List>
          </Breadcrumb.Root>
        </div>
      }
    >
      {children}
    </AppViewWrapper>
  )
}

export default ResilienceTestsViewWrapper
