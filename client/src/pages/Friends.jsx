import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Friends.css';

const Friends = () => {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'search'
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (activeTab === 'friends') {
      fetchFriends();
    } else if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [activeTab]);

  // Fetch request count on initial load
  useEffect(() => {
    fetchRequestCount();
  }, []);

  const fetchRequestCount = async () => {
    try {
      const response = await api.get('/friends/requests');
      setRequests(response.data.requests);
    } catch (error) {
      console.error('Error fetching request count:', error);
    }
  };

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const response = await api.get('/friends');
      setFriends(response.data.friends);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/friends/requests');
      setRequests(response.data.requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (searchQuery.length < 2) {
      setMessage('Please enter at least 2 characters');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const response = await api.get(`/friends/search?username=${searchQuery}`);
      setSearchResults(response.data.users);
    } catch (error) {
      console.error('Error searching users:', error);
      setMessage('Error searching users');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (friendId) => {
    try {
      await api.post('/friends/request', { friendId });
      setMessage('Friend request sent!');
      searchUsers(); // Refresh search results
    } catch (error) {
      console.error('Error sending request:', error);
      setMessage(error.response?.data?.message || 'Error sending friend request');
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await api.put(`/friends/accept/${requestId}`);
      setMessage('Friend request accepted!');
      fetchRequests();
      fetchFriends();
    } catch (error) {
      console.error('Error accepting request:', error);
      setMessage('Error accepting friend request');
    }
  };

  const removeFriend = async (friendshipId) => {
    if (!window.confirm('Remove this friend?')) return;

    try {
      await api.delete(`/friends/remove/${friendshipId}`);
      setMessage('Friend removed');
      fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      setMessage('Error removing friend');
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await api.delete(`/friends/remove/${requestId}`);
      setMessage('Request rejected');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      setMessage('Error rejecting request');
    }
  };

  return (
    <div className="friends">
      <h1>Friends</h1>

      <div className="tabs">
        <button 
          className={activeTab === 'friends' ? 'active' : ''}
          onClick={() => setActiveTab('friends')}
        >
          My Friends ({friends.length})
        </button>
        <button 
          className={activeTab === 'requests' ? 'active' : ''}
          onClick={() => setActiveTab('requests')}
        >
          Requests ({requests.length})
        </button>
        <button 
          className={activeTab === 'search' ? 'active' : ''}
          onClick={() => setActiveTab('search')}
        >
          Find Friends
        </button>
      </div>

      {message && <div className="message">{message}</div>}

      {activeTab === 'search' && (
        <div className="search-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
            />
            <button onClick={searchUsers} disabled={loading}>
              {loading ? 'Searching...' : '🔍 Search'}
            </button>
          </div>

          <div className="user-list">
            {searchResults.map((user) => (
              <div key={user.id} className="user-card">
                <div className="user-info">
                  <h3>{user.username}</h3>
                  <p className="user-email">{user.email}</p>
                  <p className="user-joined">Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="user-actions">
                  {user.isFriend ? (
                    <span className="status-badge friend">✓ Friends</span>
                  ) : user.isPending ? (
                    <span className="status-badge pending">
                      {user.requestSentByMe ? '⏳ Request Sent' : '⏳ Request Received'}
                    </span>
                  ) : (
                    <button onClick={() => sendFriendRequest(user.id)} className="btn-add">
                      ➕ Add Friend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="requests-section">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : requests.length === 0 ? (
            <p className="no-data">No pending friend requests</p>
          ) : (
            <div className="user-list">
              {requests.map((request) => (
                <div key={request.id} className="user-card">
                  <div className="user-info">
                    <h3>{request.user.username}</h3>
                    <p className="user-email">{request.user.email}</p>
                    <p className="user-joined">
                      Sent: {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="user-actions">
                    <button onClick={() => acceptRequest(request.id)} className="btn-accept">
                      ✓ Accept
                    </button>
                    <button onClick={() => rejectRequest(request.id)} className="btn-reject">
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="friends-section">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : friends.length === 0 ? (
            <p className="no-data">No friends yet. Search for users to add!</p>
          ) : (
            <div className="friends-grid">
              {friends.map((friend) => (
                <div key={friend.friendshipId || friend.id} className="friend-card">
                  <div className="friend-header">
                    <h3>{friend.username}</h3>
                    <button 
                      onClick={() => removeFriend(friend.friendshipId)} 
                      className="btn-remove-small"
                      title="Remove friend"
                    >
                      ✗
                    </button>
                  </div>
                  <p className="friend-email">{friend.email}</p>
                  <p className="friend-joined">
                    Friends since: {new Date(friend.createdAt).toLocaleDateString()}
                  </p>
                  <Link to={`/friends/${friend.id}`} className="btn-view-profile">
                    View Profile
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Friends;
