import { FC, PropsWithChildren, useState } from 'react'

import {
  Breadcrumb,
  Button,
  DropdownMenu,
  HarnessLogo,
  IconV2,
  SearchProvider,
  Sidebar,
  SidebarSearch,
  Text,
  Topbar,
  useSidebar
} from '@harnessio/ui/components'
import { CreateChaosExperimentDrawer } from '@subjects/views/chaos-experiments/create-chaos-experiment-drawer'

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

const ChaosExperimentsActions = () => {
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)

  return (
    <Topbar.Right>
      <div className="gap-cn-sm flex items-center">
        <Button variant="outline" theme="danger">
          <IconV2 name="stop-solid" />
          Abort all runs
        </Button>
        <Button variant="outline">
          <IconV2 name="download" />
          Download .CSV
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button>
              <IconV2 name="plus" />
              Create chaos experiment
              <IconV2 name="nav-arrow-down" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.IconItem
              icon="empty-page"
              title="Create from blank"
              onClick={() => setCreateDrawerOpen(true)}
            />
            <DropdownMenu.IconItem icon="copy" title="Create from template" onClick={() => {}} />
            <DropdownMenu.IconItem icon="upload" title="Upload YAML" onClick={() => {}} />
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      <CreateChaosExperimentDrawer open={createDrawerOpen} onOpenChange={setCreateDrawerOpen} />
    </Topbar.Right>
  )
}

export interface ResilienceTestsViewWrapperProps extends Omit<AppViewWrapperProps, 'breadcrumbs' | 'sidebar'> {
  activeNav: ResilienceNav
}

const ResilienceTestsViewWrapper: FC<PropsWithChildren<ResilienceTestsViewWrapperProps>> = ({
  children,
  asChild,
  childrenWrapperClassName,
  activeNav
}) => {
  const isChaos = activeNav === 'chaos-experiments'

  return (
    <AppViewWrapper
      asChild={asChild}
      childrenWrapperClassName={childrenWrapperClassName}
      sidebar={<ResilienceTestsSidebar activeNav={activeNav} />}
      breadcrumbs={
        <Topbar.Root className="bg-cn-0 sticky top-0 z-20">
          <Topbar.Left>
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
                      <Breadcrumb.Page>Chaos Experiments</Breadcrumb.Page>
                    </Breadcrumb.Item>
                  </>
                )}
              </Breadcrumb.List>
            </Breadcrumb.Root>
          </Topbar.Left>
          {isChaos && <ChaosExperimentsActions />}
        </Topbar.Root>
      }
    >
      {children}
    </AppViewWrapper>
  )
}

export default ResilienceTestsViewWrapper
