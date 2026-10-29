export type Locale = 'en' | 'pt-BR';

export interface Translations {
  common: {
    copy: string;
    copied: string;
    cancel: string;
    close: string;
    clear: string;
    loading: string;
    error: string;
    success: string;
    status: string;
    active: string;
    all: string;
  };
  navbar: {
    brandSubtitle: string;
    connected: string;
    disconnected: string;
    connecting: string;
    reconnect: string;
    credentialsTooltip: string;
    configuredApp: string;
    connectSecret: string;
    docs: string;
    languageTooltip: string;
  };
  stats: {
    activeConnections: string;
    activeSockets: string;
    occupiedChannels: string;
    totalChannels: string;
    sessionEvents: string;
    monitoredEvents: string;
    hibernation: string;
    hibernationStatus: string;
    hibernationActive: string;
    hibernationIdle: string;
  };
  tabs: {
    debugConsole: string;
    eventSimulator: string;
    channelsExplorer: string;
    snippets: string;
  };
  debugConsole: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    filterAll: string;
    filterEvents: string;
    filterConnections: string;
    filterSubscriptions: string;
    pauseStream: string;
    resumeStream: string;
    clearLogs: string;
    noEvents: string;
    noEventsMatching: string;
    payloadModalTitle: string;
    channel: string;
    event: string;
    socketId: string;
    deliveredTo: string;
    time: string;
    rawPayload: string;
  };
  simulator: {
    title: string;
    subtitle: string;
    channelLabel: string;
    channelPlaceholder: string;
    eventLabel: string;
    eventPlaceholder: string;
    payloadLabel: string;
    templatePreset: string;
    selectPreset: string;
    presetOrder: string;
    presetChat: string;
    presetAlert: string;
    formatJson: string;
    invalidJson: string;
    triggerButton: string;
    triggering: string;
    triggerSuccess: string;
    triggerError: string;
    needSecretWarning: string;
  };
  channels: {
    title: string;
    subtitle: string;
    refresh: string;
    noChannels: string;
    listenersCount: (count: number) => string;
    publicChannel: string;
    privateChannel: string;
    presenceChannel: string;
    triggerInThisChannel: string;
  };
  snippets: {
    title: string;
    subtitle: string;
    tabJavascript: string;
    tabLaravel: string;
    tabPhp: string;
    tabNode: string;
    tabPython: string;
    tabGo: string;
    tabDotnet: string;
    tabCurl: string;
    copiedSnippet: string;
    viewAllSnippets: string;
  };
  modal: {
    title: string;
    description: string;
    inputLabel: string;
    inputPlaceholder: string;
    verifyButton: string;
    verifying: string;
    success: string;
    invalidSecret: string;
    savedNote: string;
    disconnect: string;
  };
}
