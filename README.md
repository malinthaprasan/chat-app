# AskForBiz Chat Application

A modern React-based chat application with integrated network logging capabilities. This application provides a clean, responsive interface for chat interactions while automatically capturing and displaying all network requests and responses.

## Features

### 🎯 Core Functionality
- **Real-time Chat Interface**: Clean, modern chat UI with message bubbles and avatars
- **Network Logs Panel**: Collapsible panel showing all API requests and responses
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Material-UI Components**: Beautiful, accessible UI components

### 📊 Network Logging
- **Request Body**: JSON-formatted request payloads
- **Request Headers**: Complete HTTP headers for each request
- **Response Body**: JSON-formatted response data
- **Response Headers**: Complete HTTP response headers
- **Method Indicators**: Color-coded HTTP method chips (GET, POST, PUT, DELETE)
- **Timestamp Tracking**: Precise timing for each network interaction

### 🎨 User Interface
- **Header with Logo**: Prominent "AskForBiz" branding
- **Chat Window**: Left panel with message history and input
- **Collapsible Network Logs**: Right panel (desktop) or drawer (mobile)
- **Message Bubbles**: Distinct styling for user and bot messages
- **Avatar System**: Icons for user (person) and bot (robot) messages
- **Send Button**: Intuitive message sending with Enter key support

## Technology Stack

- **React 19.1.0**: Latest React with hooks and modern patterns
- **Material-UI (MUI)**: Comprehensive UI component library
- **Emotion**: CSS-in-JS styling solution
- **Responsive Design**: Mobile-first approach with breakpoints

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd react-askforbiz
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## Usage

### Chat Interface
- Type your message in the input field at the bottom
- Press Enter or click the send button to send messages
- Messages are displayed with timestamps and avatars
- Bot responses are simulated with a 1-second delay

### Network Logs Panel
- **Desktop**: Network logs appear in a collapsible panel on the right
- **Mobile**: Access network logs via the hamburger menu in the header
- Click on any log entry to expand and view details
- Each log shows:
  - HTTP method (color-coded)
  - URL endpoint
  - Timestamp
  - Request/Response bodies and headers

### Responsive Features
- **Desktop**: Full layout with chat and logs side-by-side
- **Mobile**: Chat interface with logs in a slide-out drawer
- **Tablet**: Adaptive layout that adjusts to screen size

## Project Structure

```
src/
├── App.js              # Main application component
├── App.css             # Custom styles and animations
├── index.js            # Application entry point with theme setup
└── index.css           # Global styles
```

## Key Components

### App.js
- **State Management**: Messages, network logs, UI state
- **Chat Logic**: Message handling, bot simulation
- **Network Logging**: Automatic capture of API interactions
- **Responsive Layout**: Desktop and mobile layouts

### Styling
- **Material-UI Theme**: Custom theme with brand colors
- **CSS Animations**: Smooth transitions and hover effects
- **Responsive Design**: Mobile-first CSS with breakpoints
- **Accessibility**: Focus states and keyboard navigation

## Customization

### Theme Colors
Modify the theme in `src/index.js`:
```javascript
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',    // Primary brand color
      light: '#42a5f5',   // Light variant
      dark: '#1565c0',    // Dark variant
    },
    secondary: {
      main: '#dc004e',    // Secondary brand color
    },
  },
});
```

### Network Logging
The application automatically logs all chat interactions. To integrate with real APIs:

1. Replace the simulated bot response with actual API calls
2. Network logs will automatically capture the requests/responses
3. Customize the log format in the `handleSendMessage` function

## Development

### Available Scripts
- `npm start`: Start development server
- `npm build`: Build for production
- `npm test`: Run test suite
- `npm eject`: Eject from Create React App

### Adding Features
- **New Message Types**: Extend the message object structure
- **Additional Logging**: Add more network request types
- **Real API Integration**: Replace simulated responses with actual API calls
- **Authentication**: Add user authentication and session management

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- **Optimized Rendering**: React 19 with efficient re-rendering
- **Lazy Loading**: Components load as needed
- **Minimal Bundle**: Tree-shaking for smaller bundle size
- **Responsive Images**: Optimized for different screen sizes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please open an issue in the repository or contact the development team.
