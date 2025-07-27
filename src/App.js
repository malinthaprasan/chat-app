import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Paper,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Chip,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Send as SendIcon,
  Menu as MenuIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! How can I help you today?",
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const [networkLogs, setNetworkLogs] = useState([]);
  
  const [logsPanelOpen, setLogsPanelOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState(new Set()); // Start with no logs expanded
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [networkPanelWidth, setNetworkPanelWidth] = useState(Math.floor(window.innerWidth / 3));
  const [isDragging, setIsDragging] = useState(false);
  const [apiConfig, setApiConfig] = useState({
    endpoint1: {
      url: '',
      key: '',
      authType: 'bearer'
    },
    endpoint2: {
      url: '',
      key: '',
      authType: 'test-key'
    },
    selectedEndpoint: 'endpoint1'
  });
  const messagesEndRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && !isLoading) {
      const userMessage = {
        id: messages.length + 1,
        text: newMessage,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);
      
      // Get selected endpoint configuration
      const selectedConfig = apiConfig[apiConfig.selectedEndpoint];
      
      try {
        // Prepare request data
        const requestData = {
          model: "gpt-4.1",
          messages: [
            {
              role: "user",
              content: newMessage
            }
          ]
        };

        const requestBody = JSON.stringify(requestData, null, 2);
        const requestHeaders = {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        };
        
        // Add appropriate authorization header based on endpoint type
        if (selectedConfig.authType === 'bearer') {
          requestHeaders['Authorization'] = `Bearer ${selectedConfig.key}`;
        } else if (selectedConfig.authType === 'test-key') {
          requestHeaders['Test-Key'] = selectedConfig.key;
        }

        // Make API call with timing
        const fullUrl = getFullApiUrl();
        const startTime = performance.now();
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: requestHeaders,
          body: requestBody
        });
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        const responseData = await response.json();
        
        // Check for Azure content safety violation
        if (responseData.code === 900514) {
          const errorMessage = {
            id: messages.length + 2,
            text: 'Content blocked due to Azure safety policy violation.',
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString(),
            isError: true
          };
          
          setMessages(prev => [...prev, errorMessage]);
          
          // Add error log
          const fullUrl = getFullApiUrl();
          const errorLog = {
            id: networkLogs.length + 1,
            timestamp: new Date().toLocaleTimeString(),
            method: 'POST',
            url: fullUrl,
            resourcePath: getResourcePath(fullUrl),
            responseTime: responseTime,
            statusCode: response.status,
            statusText: response.statusText,
            requestBody: requestBody,
            requestHeaders: maskSensitiveHeaders(
              Object.entries(requestHeaders)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            ),
            responseBody: JSON.stringify(responseData, null, 2),
            responseHeaders: maskSensitiveHeaders(
              Array.from(response.headers.entries())
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            )
          };
          
          setNetworkLogs(prev => [errorLog, ...prev]);
          setExpandedLogs(prev => new Set([errorLog.id, ...prev]));
          return;
        }
        
        // Check for authentication failure
        if (response.status === 401) {
          const errorMessage = {
            id: messages.length + 2,
            text: 'Authentication failed. Please check your API credentials.',
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString(),
            isError: true
          };
          
          setMessages(prev => [...prev, errorMessage]);
          
          // Add error log
          const fullUrl = getFullApiUrl();
          const errorLog = {
            id: networkLogs.length + 1,
            timestamp: new Date().toLocaleTimeString(),
            method: 'POST',
            url: fullUrl,
            resourcePath: getResourcePath(fullUrl),
            responseTime: responseTime,
            statusCode: response.status,
            statusText: response.statusText,
            requestBody: requestBody,
            requestHeaders: maskSensitiveHeaders(
              Object.entries(requestHeaders)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            ),
            responseBody: JSON.stringify(responseData, null, 2),
            responseHeaders: maskSensitiveHeaders(
              Array.from(response.headers.entries())
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            )
          };
          
          setNetworkLogs(prev => [errorLog, ...prev]);
          setExpandedLogs(prev => new Set([errorLog.id, ...prev]));
          return;
        }
        
        // Extract bot response from the API response
        const botResponse = responseData.choices?.[0]?.message?.content || 'No response received';
        
        const botMessage = {
          id: messages.length + 2,
          text: botResponse,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, botMessage]);
        
        // Add network log for this interaction
        const newLog = {
          id: networkLogs.length + 1,
          timestamp: new Date().toLocaleTimeString(),
          method: 'POST',
          url: fullUrl,
          resourcePath: getResourcePath(fullUrl),
          responseTime: responseTime,
          statusCode: response.status,
          statusText: response.statusText,
          requestBody: requestBody,
          requestHeaders: maskSensitiveHeaders(
            Object.entries(requestHeaders)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n')
          ),
          responseBody: JSON.stringify(responseData, null, 2),
          responseHeaders: maskSensitiveHeaders(
            Array.from(response.headers.entries())
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n')
          )
        };
        
        setNetworkLogs(prev => [newLog, ...prev]);
        // Auto-expand the new log entry
        setExpandedLogs(prev => new Set([newLog.id, ...prev]));
        
      } catch (error) {
        console.error('Error making API call:', error);
        
        // Add error message
        const errorMessage = {
          id: messages.length + 2,
          text: 'Sorry, I encountered an error while processing your request. Please try again.',
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, errorMessage]);
        
        // Add error log
        const fullUrl = getFullApiUrl();
        const errorLog = {
          id: networkLogs.length + 1,
          timestamp: new Date().toLocaleTimeString(),
          method: 'POST',
          url: fullUrl,
          resourcePath: getResourcePath(fullUrl),
          responseTime: 0, // No response time for errors
          statusCode: 500,
          statusText: 'Internal Error',
          requestBody: JSON.stringify({
            model: "gpt-4.1",
            messages: [{ role: "user", content: newMessage }]
          }, null, 2),
          requestHeaders: maskSensitiveHeaders(`accept: application/json
Content-Type: application/json
${selectedConfig.authType === 'bearer' ? `Authorization: Bearer ${selectedConfig.key}` : `Test-Key: ${selectedConfig.key}`}`),
          responseBody: JSON.stringify({ error: error.message }, null, 2),
          responseHeaders: 'Content-Type: application/json'
        };
        
        setNetworkLogs(prev => [errorLog, ...prev]);
        setExpandedLogs(prev => new Set([errorLog.id, ...prev]));
      } finally {
        setIsLoading(false);
        setNewMessage('');
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLogToggle = (logId) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  // Function to mask sensitive headers
  const maskSensitiveHeaders = (headersString) => {
    if (!headersString) return headersString;
    
    return headersString
      .split('\n')
      .map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.toLowerCase().startsWith('authorization:') || 
            trimmedLine.toLowerCase().startsWith('api-key:') ||
            trimmedLine.toLowerCase().startsWith('x-api-key:') ||
            trimmedLine.toLowerCase().startsWith('test-key:') ||
            trimmedLine.toLowerCase().startsWith('bearer ')) {
          // Extract the header name and mask the value
          const colonIndex = trimmedLine.indexOf(':');
          if (colonIndex !== -1) {
            const headerName = trimmedLine.substring(0, colonIndex + 1);
            return `${headerName} *******`;
          }
        }
        return line;
      })
      .join('\n');
  };

  // Drag handling functions
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newWidth = window.innerWidth - e.clientX;
      // Constrain width between 1/4 and 1/2 of screen width
      const minWidth = Math.floor(window.innerWidth / 4);
      const maxWidth = Math.floor(window.innerWidth / 2);
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setNetworkPanelWidth(constrainedWidth);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  // Function to extract resource path from URL
  const getResourcePath = (url) => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      // Extract the part after the last segment that contains 'chat/completions'
      const chatCompletionsIndex = path.indexOf('/chat/completions');
      if (chatCompletionsIndex !== -1) {
        return path.substring(chatCompletionsIndex);
      }
      return path;
    } catch (error) {
      // If URL parsing fails, try to remove query parameters manually
      const queryIndex = url.indexOf('?');
      if (queryIndex !== -1) {
        return url.substring(0, queryIndex);
      }
      return url;
    }
  };

          // Function to build full API URL
  const getFullApiUrl = () => {
    const selectedConfig = apiConfig[apiConfig.selectedEndpoint];
    return `${selectedConfig.url}/chat/completions?api-version=2024-06-01`;
  };

  const NetworkLogsPanel = () => (
    <Paper 
      elevation={3} 
      sx={{ 
        height: '100%', 
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ textAlign: 'center' }}>
          Network Logs
        </Typography>
      </Box>
      
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {networkLogs.map((log) => {
          const isExpanded = expandedLogs.has(log.id);
          return (
            <Paper 
              key={log.id} 
              variant="outlined" 
              sx={{ 
                mb: 2, 
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              {/* Log Entry Header - Clickable */}
              <Box 
                sx={{ 
                  p: 1.5, 
                  backgroundColor: 'grey.100',
                  borderBottom: isExpanded ? 1 : 0,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'grey.200'
                  },
                  transition: 'background-color 0.2s'
                }}
                onClick={() => handleLogToggle(log.id)}
              >
                <IconButton 
                  size="small" 
                  sx={{ p: 0, color: 'text.secondary' }}
                >
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
                <Chip 
                  label={log.method} 
                  color={log.method === 'GET' ? 'success' : log.method === 'POST' ? 'primary' : log.method === 'PUT' ? 'warning' : 'error'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace' }}>
                  {log.resourcePath || log.url}
                </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                {log.responseTime ? `${log.responseTime}ms` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                {log.timestamp}
              </Typography>
              <Chip 
                label={log.statusCode || '200'} 
                size="small"
                color={log.statusCode >= 200 && log.statusCode < 300 ? 'success' : log.statusCode >= 400 ? 'error' : 'warning'}
                sx={{ fontWeight: 600 }}
              />
              </Box>

              {/* Collapsible Content */}
              {isExpanded && (
                <Box sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                    Request
                  </Typography>
                  
                  {/* Request Line */}
                  <Box sx={{ mb: 1, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {log.method} {log.url} HTTP/1.1
                    </Typography>
                  </Box>

                                {/* Request Headers */}
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                Request Headers:
              </Typography>
              <Box sx={{ mb: 1.5, p: 1, backgroundColor: 'grey.50', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{maskSensitiveHeaders(log.requestHeaders)}</pre>
              </Box>

                  {/* Request Body */}
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Request Body:
                  </Typography>
                  <Box sx={{ mb: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{log.requestBody}</pre>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  {/* Response Details */}
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
                    Response
                  </Typography>
                  
                  {/* Response Status Line */}
                  <Box sx={{ mb: 1, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      HTTP/1.1 {log.statusCode || '200'} {log.statusText || 'OK'}
                    </Typography>
                  </Box>

                                {/* Response Headers */}
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                Response Headers:
              </Typography>
              <Box sx={{ mb: 1.5, p: 1, backgroundColor: 'grey.50', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{maskSensitiveHeaders(log.responseHeaders)}</pre>
              </Box>

                  {/* Response Body */}
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Response Body:
                  </Typography>
                  <Box sx={{ p: 1, backgroundColor: 'grey.50', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{log.responseBody}</pre>
                  </Box>
                </Box>
              )}
            </Paper>
          );
        })}
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2, display: { md: 'none' } }}
            onClick={() => setMobileDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            AskForBiz
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              color="inherit"
              aria-label="toggle network logs"
              onClick={() => setLogsPanelOpen(!logsPanelOpen)}
              sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center', height: 40, width: 40 }}
            >
              {logsPanelOpen ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>
            <IconButton
              color="inherit"
              aria-label="settings"
              onClick={() => setShowConfig(true)}
              sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center', height: 40, width: 40 }}
            >
              <SettingsIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Chat Panel */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          minWidth: 0
        }}>
          {/* Messages */}
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto', 
            p: 2,
            backgroundColor: 'grey.50'
          }}>
            <List>
              {messages.map((message) => (
                <ListItem
                  key={message.id}
                  sx={{
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: 1
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ 
                      bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main'
                    }}>
                      {message.sender === 'user' ? <PersonIcon /> : <BotIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      maxWidth: '70%',
                      backgroundColor: message.isError ? '#ffebee' : message.sender === 'user' ? 'primary.light' : 'white',
                      color: message.isError ? '#c62828' : message.sender === 'user' ? 'white' : 'text.primary',
                      border: message.isError ? 1 : 0,
                      borderColor: message.isError ? '#ef5350' : 'transparent'
                    }}
                  >
                    <Typography variant="body1">
                      {message.text}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block', 
                        mt: 1,
                        opacity: 0.7
                      }}
                    >
                      {message.timestamp}
                    </Typography>
                  </Paper>
                </ListItem>
              ))}
              <div ref={messagesEndRef} />
            </List>
          </Box>

          {/* Message Input */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                multiline
                maxRows={4}
              />
              <Button
                variant="contained"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isLoading}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                {isLoading ? (
                  <Box sx={{ 
                    width: 20, 
                    height: 20, 
                    border: '2px solid #fff', 
                    borderTop: '2px solid transparent', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }} />
                ) : (
                  <SendIcon />
                )}
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Network Logs Panel - Desktop */}
        {!isMobile && logsPanelOpen && (
          <Box sx={{ 
            width: networkPanelWidth, 
            borderLeft: 1, 
            borderColor: 'divider',
            display: { xs: 'none', md: 'block' },
            position: 'relative'
          }}>
            <NetworkLogsPanel />
            {/* Drag Handle */}
            <Box
              sx={{
                position: 'absolute',
                left: -2,
                top: 0,
                bottom: 0,
                width: 4,
                backgroundColor: isDragging ? 'primary.main' : 'transparent',
                opacity: isDragging ? 0.5 : 0,
                cursor: 'col-resize',
                '&:hover': {
                  backgroundColor: 'primary.main',
                  opacity: 0.3
                },
                transition: 'all 0.2s ease',
                zIndex: 1000
              }}
              onMouseDown={handleMouseDown}
            />
            {/* Width Indicator */}
            {isDragging && (
              <Box
                sx={{
                  position: 'absolute',
                  left: -60,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'primary.main',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  zIndex: 1001
                }}
              >
                {networkPanelWidth}px
              </Box>
            )}
          </Box>
        )}

        {/* Mobile Drawer for Network Logs */}
        <Drawer
          anchor="right"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          sx={{ display: { md: 'none' } }}
        >
          <Box sx={{ width: 350, height: '100%' }}>
            <NetworkLogsPanel />
          </Box>
        </Drawer>
      </Box>

      {/* Configuration Dialog */}
      <Dialog 
        open={showConfig} 
        onClose={() => setShowConfig(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>API Configuration</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure two endpoints with different authentication methods. Select which endpoint to use for API calls.
            </Typography>
            
            {/* Endpoint Selection */}
            <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                Select Active Endpoint:
              </Typography>
              <RadioGroup
                value={apiConfig.selectedEndpoint}
                onChange={(e) => setApiConfig(prev => ({ ...prev, selectedEndpoint: e.target.value }))}
                row
              >
                <FormControlLabel 
                  value="endpoint1" 
                  control={<Radio />} 
                  label="Endpoint 1" 
                />
                <FormControlLabel 
                  value="endpoint2" 
                  control={<Radio />} 
                  label="Endpoint 2" 
                />
              </RadioGroup>
            </FormControl>

            {/* Endpoint 1 Configuration */}
            {apiConfig.selectedEndpoint === 'endpoint1' && (
              <Paper sx={{ p: 2, mb: 3, border: 2, borderColor: 'primary.main' }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  Endpoint 1
                </Typography>
                <TextField
                  fullWidth
                  label="API URL"
                  value={apiConfig.endpoint1.url}
                  onChange={(e) => setApiConfig(prev => ({ 
                    ...prev, 
                    endpoint1: { ...prev.endpoint1, url: e.target.value }
                  }))}
                  margin="normal"
                  multiline
                  rows={2}
                  helperText="The Azure OpenAI API endpoint URL (up to /chat/completions)"
                />
                <TextField
                  fullWidth
                  label="Bearer Token"
                  value={apiConfig.endpoint1.key}
                  onChange={(e) => setApiConfig(prev => ({ 
                    ...prev, 
                    endpoint1: { ...prev.endpoint1, key: e.target.value }
                  }))}
                  margin="normal"
                  multiline
                  rows={4}
                  helperText="The Bearer token for API authentication (Authorization: Bearer <token>)"
                />
              </Paper>
            )}

            {/* Endpoint 2 Configuration */}
            {apiConfig.selectedEndpoint === 'endpoint2' && (
              <Paper sx={{ p: 2, border: 2, borderColor: 'primary.main' }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  Endpoint 2
                </Typography>
                <TextField
                  fullWidth
                  label="API URL"
                  value={apiConfig.endpoint2.url}
                  onChange={(e) => setApiConfig(prev => ({ 
                    ...prev, 
                    endpoint2: { ...prev.endpoint2, url: e.target.value }
                  }))}
                  margin="normal"
                  multiline
                  rows={2}
                  helperText="The Azure OpenAI API endpoint URL (up to /chat/completions)"
                />
                <TextField
                  fullWidth
                  label="Test Key"
                  value={apiConfig.endpoint2.key}
                  onChange={(e) => setApiConfig(prev => ({ 
                    ...prev, 
                    endpoint2: { ...prev.endpoint2, key: e.target.value }
                  }))}
                  margin="normal"
                  multiline
                  rows={4}
                  helperText="The Test-Key for API authentication (Test-Key: <key>)"
                />
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfig(false)}>Cancel</Button>
          <Button 
            onClick={() => setShowConfig(false)} 
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;
