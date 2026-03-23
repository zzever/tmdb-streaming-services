import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/context/LocaleContext";
import { ListsProvider } from "@/context/ListsContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { WatchedProvider } from "@/context/WatchedContext";
import Home from "@/pages/Home";
import OpenSource from "@/pages/OpenSource";
import SelfHost from "@/pages/SelfHost";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/open-source" component={OpenSource} />
      <Route path="/self-host" component={SelfHost} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <WatchlistProvider>
          <WatchedProvider>
          <ListsProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </ListsProvider>
          </WatchedProvider>
        </WatchlistProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

export default App;
