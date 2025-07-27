import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
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
  Select,
  MenuItem,
  Tooltip,
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
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Stop as StopIcon,
  Replay as ReplayIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandAllIcon,
  ExpandLess as CollapseAllIcon
} from '@mui/icons-material';
import CleaningServicesOutlinedIcon from '@mui/icons-material/CleaningServicesOutlined';
import PlagiarismOutlinedIcon from '@mui/icons-material/PlagiarismOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
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
  const [abortController, setAbortController] = useState(null);
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
      
      // Create abort controller for this request
      const controller = new AbortController();
      setAbortController(controller);
      
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
          body: requestBody,
          signal: controller.signal
        });
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        let responseData;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          // Handle cases where response has no body or invalid JSON
          responseData = "";
        }
        
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
            endpointType: apiConfig.selectedEndpoint === 'endpoint1' ? 'DIR' : 'EGW',
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
            endpointType: apiConfig.selectedEndpoint === 'endpoint1' ? 'DIR' : 'EGW',
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
        
        // Check for rate limiting (429)
        if (response.status === 429) {
          const errorMessage = {
            id: messages.length + 2,
            text: 'Too many requests.',
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
            endpointType: apiConfig.selectedEndpoint === 'endpoint1' ? 'DIR' : 'EGW',
            responseTime: responseTime,
            statusCode: response.status,
            statusText: response.statusText,
            requestBody: requestBody,
            requestHeaders: maskSensitiveHeaders(
              Object.entries(requestHeaders)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            ),
            responseBody: responseData ? JSON.stringify(responseData, null, 2) : 'No response body',
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
        
        // Check for not found (404)
        if (response.status === 404) {
          const errorMessage = {
            id: messages.length + 2,
            text: 'Not found. Check endpoint URL.',
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
            endpointType: apiConfig.selectedEndpoint === 'endpoint1' ? 'DIR' : 'EGW',
            responseTime: responseTime,
            statusCode: response.status,
            statusText: response.statusText,
            requestBody: requestBody,
            requestHeaders: maskSensitiveHeaders(
              Object.entries(requestHeaders)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            ),
            responseBody: responseData ? JSON.stringify(responseData, null, 2) : 'No response body',
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
          endpointType: apiConfig.selectedEndpoint === 'endpoint1' ? 'DIR' : 'EGW',
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
        if (error.name === 'AbortError') {
          // Request was cancelled by user
          const cancelMessage = {
            id: messages.length + 2,
            text: 'Request cancelled.',
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString(),
            isError: true
          };
          setMessages(prev => [...prev, cancelMessage]);
        } else {
          console.error('Error making API call:', error);
          
          // Add error message
          const errorMessage = {
            id: messages.length + 2,
            text: 'Sorry, I encountered an error while processing your request. Please try again.',
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
            endpointType: apiConfig.selectedEndpoint === 'endpoint1' ? 'DIR' : 'EGW',
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
        }
      } finally {
        setIsLoading(false);
        setNewMessage('');
        setAbortController(null);
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

  const handleExpandAll = () => {
    const allLogIds = networkLogs.map(log => log.id);
    setExpandedLogs(new Set(allLogIds));
  };

  const handleCollapseAll = () => {
    setExpandedLogs(new Set());
  };

  // Function to mask sensitive headers
  const maskSensitiveHeaders = (headersString) => {
    if (!headersString) return headersString;
    
    // Headers to completely remove
    const headersToRemove = [
      'x-ms-client-request-id',
      'x-ms-deployment-name',
      'x-ms-rai-invoked',
      'x-ms-region',
      'x-ratelimit-limit-requests',
      'x-ratelimit-limit-tokens',
      'x-ratelimit-remaining-requests',
      'x-ratelimit-remaining-tokens',
      'azureml-model-session',
      'apim-request-id'
    ];
    
    return headersString
      .split('\n')
      .map(line => {
        const trimmedLine = line.trim();
        
        // Check if this line should be completely removed
        const shouldRemove = headersToRemove.some(header => 
          trimmedLine.toLowerCase().startsWith(header.toLowerCase() + ':')
        );
        if (shouldRemove) {
          return null; // This will be filtered out
        }
        
        // Check if this line should be masked
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
      .filter(line => line !== null) // Remove null lines
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

  const handleClearChat = () => {
    // Keep only the first welcome message
    setMessages(prev => prev.slice(0, 1));
    // Clear network logs as well
    setNetworkLogs([]);
    setExpandedLogs(new Set());
  };

  const handleStopChat = () => {
    if (abortController) {
      abortController.abort();
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleCopyMessage = (messageText) => {
    setNewMessage(messageText);
    // Focus on the input field
    setTimeout(() => {
      const inputElement = document.querySelector('textarea[placeholder="Enter message"]');
      if (inputElement) {
        inputElement.focus();
      }
    }, 100);
  };

  const handleReplayMessage = (messageText) => {
    // Send the message directly with the provided text
    if (messageText.trim() && !isLoading) {
      const userMessage = {
        id: messages.length + 1,
        text: messageText,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);
      
      // Create abort controller for this request
      const controller = new AbortController();
      setAbortController(controller);
      
      // Get selected endpoint configuration
      const selectedConfig = apiConfig[apiConfig.selectedEndpoint];
      
      // Prepare request data
      const requestData = {
        model: "gpt-4.1",
        messages: [
          {
            role: "user",
            content: messageText
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
      
      fetch(fullUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal
      })
      .then(async (response) => {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        let responseData;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          // Handle cases where response has no body or invalid JSON
          responseData = null;
        }
        
        // Check for Azure content safety violation
        if (responseData && responseData.code === 900514) {
          const errorMessage = {
            id: messages.length + 2,
            text: 'Content blocked due to Azure safety policy violation.',
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString(),
            isError: true
          };
          
          setMessages(prev => [...prev, errorMessage]);
          
          // Add error log
          const errorLog = {
            id: networkLogs.length + 1,
            timestamp: new Date().toLocaleTimeString(),
            method: 'POST',
            url: fullUrl,
            resourcePath: getResourcePath(fullUrl),
            endpointType: apiConfig.selectedEndpoint === 'endpoint1' ? 'DIR' : 'EGW',
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
          const errorLog = {
            id: networkLogs.length + 1,
            timestamp: new Date().toLocaleTimeString(),
            method: 'POST',
            url: fullUrl,
            resourcePath: getResourcePath(fullUrl),
            endpointType: apiConfig.selectedEndpoint === 'endpoint1' ? 'DIR' : 'EGW',
            responseTime: responseTime,
            statusCode: response.status,
            statusText: response.statusText,
            requestBody: requestBody,
            requestHeaders: maskSensitiveHeaders(
              Object.entries(requestHeaders)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            ),
            responseBody: responseData ? JSON.stringify(responseData, null, 2) : 'No response body',
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
        
        // Check for rate limiting (429)
        if (response.status === 429) {
          const errorMessage = {
            id: messages.length + 2,
            text: 'Too many requests.',
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString(),
            isError: true
          };
          
          setMessages(prev => [...prev, errorMessage]);
          
          // Add error log
          const errorLog = {
            id: networkLogs.length + 1,
            timestamp: new Date().toLocaleTimeString(),
            method: 'POST',
            url: fullUrl,
            resourcePath: getResourcePath(fullUrl),
            endpointType: apiConfig.selectedEndpoint === 'endpoint1' ? 'DIR' : 'EGW',
            responseTime: responseTime,
            statusCode: response.status,
            statusText: response.statusText,
            requestBody: requestBody,
            requestHeaders: maskSensitiveHeaders(
              Object.entries(requestHeaders)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            ),
            responseBody: responseData ? JSON.stringify(responseData, null, 2) : 'No response body',
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
        
        // Check for not found (404)
        if (response.status === 404) {
          const errorMessage = {
            id: messages.length + 2,
            text: 'Not found. Check endpoint URL.',
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString(),
            isError: true
          };
          
          setMessages(prev => [...prev, errorMessage]);
          
          // Add error log
          const errorLog = {
            id: networkLogs.length + 1,
            timestamp: new Date().toLocaleTimeString(),
            method: 'POST',
            url: fullUrl,
            resourcePath: getResourcePath(fullUrl),
            endpointType: apiConfig.selectedEndpoint === 'endpoint1' ? 'DIR' : 'EGW',
            responseTime: responseTime,
            statusCode: response.status,
            statusText: response.statusText,
            requestBody: requestBody,
            requestHeaders: maskSensitiveHeaders(
              Object.entries(requestHeaders)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            ),
            responseBody: responseData ? JSON.stringify(responseData, null, 2) : 'No response body',
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
        const botResponse = responseData && responseData.choices && responseData.choices[0] && responseData.choices[0].message ? responseData.choices[0].message.content : 'No response received';
        
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
          endpointType: apiConfig.selectedEndpoint === 'endpoint1' ? 'DIR' : 'EGW',
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
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          // Request was cancelled by user
          const cancelMessage = {
            id: messages.length + 2,
            text: 'Request cancelled.',
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString(),
            isError: true
          };
          setMessages(prev => [...prev, cancelMessage]);
        } else {
          console.error('Error making API call:', error);
          
          // Add error message
          const errorMessage = {
            id: messages.length + 2,
            text: 'Sorry, I encountered an error while processing your request. Please try again.',
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString(),
            isError: true
          };
          
          setMessages(prev => [...prev, errorMessage]);
          
          // Add error log
          const errorLog = {
            id: networkLogs.length + 1,
            timestamp: new Date().toLocaleTimeString(),
            method: 'POST',
            url: fullUrl,
            resourcePath: getResourcePath(fullUrl),
            endpointType: apiConfig.selectedEndpoint === 'endpoint1' ? 'DIR' : 'EGW',
            responseTime: 0, // No response time for errors
            statusCode: 500,
            statusText: 'Internal Error',
            requestBody: JSON.stringify({
              model: "gpt-4.1",
              messages: [{ role: "user", content: messageText }]
            }, null, 2),
            requestHeaders: maskSensitiveHeaders(`accept: application/json
Content-Type: application/json
${selectedConfig.authType === 'bearer' ? `Authorization: Bearer ${selectedConfig.key}` : `Test-Key: ${selectedConfig.key}`}`),
            responseBody: JSON.stringify({ error: error.message }, null, 2),
            responseHeaders: 'Content-Type: application/json'
          };
          
          setNetworkLogs(prev => [errorLog, ...prev]);
          setExpandedLogs(prev => new Set([errorLog.id, ...prev]));
        }
      })
      .finally(() => {
        setIsLoading(false);
        setAbortController(null);
      });
    }
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Network Logs
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Expand all" placement="top">
              <IconButton
                size="small"
                onClick={handleExpandAll}
                disabled={networkLogs.length === 0}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' }
                }}
              >
                <ExpandAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Collapse all" placement="top">
              <IconButton
                size="small"
                onClick={handleCollapseAll}
                disabled={expandedLogs.size === 0}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' }
                }}
              >
                <CollapseAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
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
                                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`[${log.endpointType}]`}
                      size="small"
                      sx={{
                        backgroundColor: log.endpointType === 'DIR' ? '#e3f2fd' : '#f3e5f5',
                        color: log.endpointType === 'DIR' ? '#1976d2' : '#7b1fa2',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 20
                      }}
                    />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      /chat/completions
                    </Typography>
                  </Box>
                              <Typography 
                variant="caption" 
                sx={{ 
                  mr: 1,
                  color: log.responseTime ? (log.responseTime < 2000 ? 'success.main' : 'warning.main') : 'text.secondary',
                  fontWeight: log.responseTime ? 600 : 400
                }}
              >
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
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
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
          <FormControl size="small" sx={{ width: 220, mr: 2, display: { xs: 'none', md: 'block' } }}>
            <Select
              value={apiConfig.selectedEndpoint}
              onChange={(e) => setApiConfig(prev => ({ ...prev, selectedEndpoint: e.target.value }))}
              displayEmpty
              sx={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                width: '100%',
                '& .MuiSelect-icon': {
                  color: 'white'
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)'
                }
              }}
            >
              <MenuItem value="endpoint1">Direct (DIR)</MenuItem>
              <MenuItem value="endpoint2">Via Egress GW (EGW)</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              color="inherit"
              aria-label="clear chat"
              onClick={handleClearChat}
              sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center', height: 40, width: 40 }}
            >
              <CleaningServicesOutlinedIcon />
            </IconButton>
            <IconButton
              color="inherit"
              aria-label="toggle network logs"
              onClick={() => setLogsPanelOpen(!logsPanelOpen)}
              sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center', height: 40, width: 40 }}
            >
              <PlagiarismOutlinedIcon />
            </IconButton>
            <IconButton
              color="inherit"
              aria-label="settings"
              onClick={() => setShowConfig(true)}
              sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center', height: 40, width: 40 }}
            >
              <SettingsOutlinedIcon />
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
                      borderColor: message.isError ? '#ef5350' : 'transparent',
                      position: 'relative',
                      '&:hover .replay-button': {
                        opacity: 1,
                        visibility: 'visible'
                      }
                    }}
                  >
                    {message.isError ? (
                      <Typography variant="body1">
                        {message.text}
                      </Typography>
                    ) : (
                      <Box sx={{ 
                        '& h1, & h2, & h3, & h4, & h5, & h6': { 
                          mt: 1, mb: 1, fontWeight: 600 
                        },
                        '& p': { 
                          mb: 1 
                        },
                        '& ul, & ol': { 
                          mb: 1, pl: 2 
                        },
                        '& li': { 
                          mb: 0.5 
                        },
                        '& code': { 
                          backgroundColor: 'grey.100', 
                          px: 0.5, 
                          py: 0.25, 
                          borderRadius: 0.5,
                          fontFamily: 'monospace',
                          fontSize: '0.875em'
                        },
                        '& pre': { 
                          backgroundColor: 'grey.100', 
                          p: 1, 
                          borderRadius: 1,
                          overflow: 'auto',
                          mb: 1
                        },
                        '& pre code': { 
                          backgroundColor: 'transparent',
                          p: 0
                        },
                        '& blockquote': { 
                          borderLeft: 3, 
                          borderColor: 'grey.300', 
                          pl: 2, 
                          ml: 0,
                          fontStyle: 'italic',
                          color: 'text.secondary'
                        },
                        '& a': { 
                          color: 'primary.main',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }
                      }}>
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      </Box>
                    )}
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
                    {message.sender === 'user' && (
                      <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Copy to input" placement="top">
                          <IconButton
                            className="replay-button"
                            size="small"
                            onClick={() => handleCopyMessage(message.text)}
                            sx={{
                              opacity: 0,
                              visibility: 'hidden',
                              transition: 'opacity 0.2s ease, visibility 0.2s ease',
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              color: 'primary.main',
                              width: 24,
                              height: 24,
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 1)',
                                transform: 'scale(1.1)'
                              }
                            }}
                          >
                            <CopyIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Replay" placement="top">
                          <IconButton
                            className="replay-button"
                            size="small"
                            onClick={() => handleReplayMessage(message.text)}
                            sx={{
                              opacity: 0,
                              visibility: 'hidden',
                              transition: 'opacity 0.2s ease, visibility 0.2s ease',
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              color: 'primary.main',
                              width: 24,
                              height: 24,
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 1)',
                                transform: 'scale(1.1)'
                              }
                            }}
                          >
                            <ReplayIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Paper>
                </ListItem>
              ))}
              {isLoading && (
                <ListItem
                  sx={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 1
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                      <BotIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      maxWidth: '70%',
                      backgroundColor: 'white',
                      color: 'text.primary',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: 'text.secondary',
                          animation: 'typing 1.4s infinite ease-in-out',
                          animationDelay: '0s'
                        }}
                      />
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: 'text.secondary',
                          animation: 'typing 1.4s infinite ease-in-out',
                          animationDelay: '0.2s'
                        }}
                      />
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: 'text.secondary',
                          animation: 'typing 1.4s infinite ease-in-out',
                          animationDelay: '0.4s'
                        }}
                      />
                    </Box>
                  </Paper>
                </ListItem>
              )}
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
              {isLoading ? (
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleStopChat}
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  <StopIcon />
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  <SendIcon />
                </Button>
              )}
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
                  label="Direct (DIR)" 
                />
                <FormControlLabel 
                  value="endpoint2" 
                  control={<Radio />} 
                  label="Via Egress GW (EGW)" 
                />
              </RadioGroup>
            </FormControl>

            {/* Endpoint 1 Configuration */}
            {apiConfig.selectedEndpoint === 'endpoint1' && (
              <Paper sx={{ p: 2, mb: 3, border: 2, borderColor: 'primary.main' }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  Direct (DIR)
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
                  Via Egress GW (EGW)
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
