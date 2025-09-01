import { render, screen } from '@testing-library/react'
import VideoContainer from '../VideoContainer'

describe('VideoContainer', () => {
  it('renders video container with both local and remote videos', () => {
    render(<VideoContainer />)
    
    const localVideo = screen.getByTestId('local-video')
    const remoteVideo = screen.getByTestId('remote-video')
    
    expect(localVideo).toBeInTheDocument()
    expect(remoteVideo).toBeInTheDocument()
  })
})
