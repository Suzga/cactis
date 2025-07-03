import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    getDocs, 
    onSnapshot, 
    query, 
    where,
    setDoc,
    Timestamp,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    runTransaction,
    orderBy,
    collectionGroup,
    documentId
} from 'firebase/firestore';

// --- Helper Functions & Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-actor-rating-app';
const TMDB_API_KEY = 'd1a29853585a939151d65404595e135d'; // Replace with a real TMDB API key for full functionality
const ADMIN_UID = "REPLACE_WITH_YOUR_ACTUAL_ADMIN_USER_ID"; // ** IMPORTANT: Replace this with your user ID to enable admin features **

// --- Re-added Tooltip Component ---
const Tooltip = ({ text, children }) => (
    <div className="relative flex items-center group">
        {children}
        <div className="absolute bottom-full mb-2 w-48 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            {text}
        </div>
    </div>
);

// --- Authentication Components ---
const AuthPage = ({ auth, db }) => {
    const [isLogin, setIsLogin] = useState(true);
    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-[#2c7da0] text-white shadow-xl rounded-2xl p-8">
                    <h1 className="text-3xl font-extrabold text-center tracking-tight mb-2">
                        C<span className="text-[#eef4ed]">Actis</span>
                    </h1>
                     <p className="text-center text-sm text-gray-200 mb-8">
                        {isLogin ? 'Welcome back!' : 'Create your account'}
                    </p>
                    {isLogin ? <LoginPage auth={auth} /> : <SignUpPage auth={auth} db={db} />}
                    <div className="mt-6 text-center">
                        <button 
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm font-medium text-[#eef4ed] hover:underline"
                        >
                            {isLogin ? "Need an account? Sign Up" : "Have an account? Log In"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LoginPage = ({ auth }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Firebase uses email for auth, so we'll append a dummy domain
    const email = `${username.toLowerCase()}@cactis.app`;

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError("Invalid username or password. Please try again.");
            console.error("Login error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label htmlFor="login-username" className="block text-sm font-medium">Username</label>
                <input id="login-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-[#006466] border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#eef4ed]" />
            </div>
             <div>
                <label htmlFor="login-password"  className="block text-sm font-medium">Password</label>
                <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-[#006466] border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#eef4ed]" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-[#006466] text-white font-bold py-2.5 px-4 rounded-md hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006466] disabled:bg-opacity-60 transition-colors duration-300">
                {isLoading ? 'Logging In...' : 'Log In'}
            </button>
        </form>
    );
};

const SignUpPage = ({ auth, db }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const email = `${username.toLowerCase()}@cactis.app`;

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const usernameDocRef = doc(db, "artifacts", appId, "public/data/usernames", username.toLowerCase());
            const docSnap = await getDoc(usernameDocRef);

            if (docSnap.exists()) {
                setError("This username is already taken. Please choose another.");
                setIsLoading(false);
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
             const userProfile = { 
                username: username,
                bio: '',
                profilePictureUrl: `https://placehold.co/128x128/71717a/e5e7eb?text=${username.charAt(0).toUpperCase()}`,
                isSuspended: false
             };
            await setDoc(doc(db, "artifacts", appId, "public/data/users", userCredential.user.uid), userProfile);
            await setDoc(usernameDocRef, { uid: userCredential.user.uid });

        } catch (err) {
             setError("Failed to create account. Please try again.");
             console.error("Sign up error:", err);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSignUp} className="space-y-6">
            <div>
                <label htmlFor="signup-username" className="block text-sm font-medium">Username</label>
                <input id="signup-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-[#006466] border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#eef4ed]" />
            </div>
            <div>
                <label htmlFor="signup-password"  className="block text-sm font-medium">Password</label>
                <input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-[#006466] border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#eef4ed]" />
                 <p className="text-xs text-gray-300 mt-2">
                    At least 6 characters long.
                </p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-[#006466] text-white font-bold py-2.5 px-4 rounded-md hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006466] disabled:bg-opacity-60 transition-colors duration-300">
                {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
        </form>
    );
};


// --- Comment Components ---

const VoteButtons = ({ docRef, db, currentUser }) => {
    const [voteData, setVoteData] = useState({ likes: [], dislikes: [] });
    const userVote = currentUser ? (voteData.likes.includes(currentUser.uid) ? 'like' : voteData.dislikes.includes(currentUser.uid) ? 'dislike' : null) : null;

    useEffect(() => {
        if (!docRef || !currentUser) return;
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setVoteData({ likes: data.likes || [], dislikes: data.dislikes || [] });
            }
        });
        return () => unsubscribe();
    }, [docRef, currentUser]);

    const handleVote = async (newVote) => {
        if (!docRef || !currentUser) return;
        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            if (!docSnapshot.exists()) {
                throw "Document does not exist!";
            }

            let currentLikes = docSnapshot.data().likes || [];
            let currentDislikes = docSnapshot.data().dislikes || [];

            const hadLiked = currentLikes.includes(currentUser.uid);
            const hadDisliked = currentDislikes.includes(currentUser.uid);

            if (hadLiked) currentLikes = currentLikes.filter(id => id !== currentUser.uid);
            if (hadDisliked) currentDislikes = currentDislikes.filter(id => id !== currentUser.uid);

            if (newVote === 'like' && !hadLiked) currentLikes.push(currentUser.uid);
            if (newVote === 'dislike' && !hadDisliked) currentDislikes.push(currentUser.uid);
            
            const voteScore = currentLikes.length - currentDislikes.length;

            transaction.update(docRef, { 
                likes: currentLikes, 
                dislikes: currentDislikes,
                voteScore: voteScore 
            });
        }).catch(err => console.error("Vote transaction failed: ", err));
    };

    return (
        <div className="flex items-center space-x-4 text-gray-300">
            <button onClick={() => handleVote('like')} className={`flex items-center space-x-1 hover:text-[#eef4ed] ${userVote === 'like' ? 'text-white' : ''}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.562 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"></path></svg>
                <span>{voteData.likes.length}</span>
            </button>
            <button onClick={() => handleVote('dislike')} className={`flex items-center space-x-1 hover:text-red-400 ${userVote === 'dislike' ? 'text-red-500' : ''}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.642a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.438 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.867a4 4 0 00.8-2.4z"></path></svg>
                 <span>{voteData.dislikes.length}</span>
            </button>
        </div>
    );
};

const Comment = ({ comment, children, db, currentUser, actorId, forumPostId }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [authorProfile, setAuthorProfile] = useState({ profilePictureUrl: `https://placehold.co/40x40/71717a/e5e7eb?text=${comment.username ? comment.username.charAt(0).toUpperCase() : '?'}` });

    useEffect(() => {
        if (db && comment.userId) {
            const userProfileRef = doc(db, "artifacts", appId, "public/data/users", comment.userId);
            getDoc(userProfileRef).then(docSnap => {
                if (docSnap.exists()) {
                    setAuthorProfile(docSnap.data());
                }
            });
        }
    }, [db, comment.userId]);

    let docRef;
    if (actorId) { // It's an actor review comment
         docRef = comment.isReply 
            ? doc(db, "artifacts", appId, `public/data/actors/${actorId}/reviews/${comment.parentId}/replies`, comment.id)
            : doc(db, "artifacts", appId, `public/data/actors/${actorId}/reviews`, comment.id);
    } else { // It's a forum post comment
         docRef = comment.isReply 
            ? doc(db, "artifacts", appId, `public/data/forum/${forumPostId}/comments/${comment.parentId}/replies`, comment.id)
            : doc(db, "artifacts", appId, `public/data/forum/${forumPostId}/comments`, comment.id);
    }


    const handlePostReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !currentUser) return;
        setIsReplying(true);

        let repliesRef;
        if (actorId) {
            repliesRef = collection(db, "artifacts", appId, `public/data/actors/${actorId}/reviews`, comment.id, 'replies');
        } else {
             repliesRef = collection(db, "artifacts", appId, `public/data/forum/${forumPostId}/comments`, comment.id, 'replies');
        }
        
        await addDoc(repliesRef, {
            text: replyText,
            userId: currentUser.uid,
            username: currentUser.username,
            createdAt: Timestamp.now(),
            likes: [],
            dislikes: [],
            voteScore: 0
        });

        setIsReplying(false);
        setReplyText('');
        setShowReplyForm(false);
    };

    return (
        <div className="flex space-x-3">
            <img className="h-10 w-10 rounded-full bg-[#006466] object-cover" src={authorProfile.profilePictureUrl} alt="" />
            <div className="flex-1">
                <div className="bg-[#2c7da0] text-white rounded-lg p-3">
                    <p className="text-sm font-semibold">{comment.username || 'User'}</p>
                    {comment.title && <p className="text-md font-bold mt-2">{comment.title}</p>}
                    <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap break-words">{comment.text}</p>
                    {comment.viewedMovies && (
                         <div className="mt-2 pt-2 border-t border-gray-500">
                             <p className="text-xs font-semibold text-gray-400">Based on viewing:</p>
                             <p className="text-xs text-gray-300 italic">{comment.viewedMovies}</p>
                         </div>
                    )}
                </div>
                <div className="flex items-center space-x-4 mt-1 pl-3 text-xs">
                    <VoteButtons docRef={docRef} db={db} currentUser={currentUser} />
                    {!comment.isReply && (
                         <button onClick={() => setShowReplyForm(!showReplyForm)} className="font-semibold text-gray-400 hover:underline">Reply</button>
                    )}
                </div>

                {showReplyForm && (
                     <form onSubmit={handlePostReply} className="mt-3 ml-3 flex items-start space-x-3">
                        <img className="h-8 w-8 rounded-full bg-[#006466] object-cover" src={currentUser.profilePictureUrl} alt="" />
                        <div className="flex-1">
                           <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows="2" placeholder="Add a reply..." className="w-full text-sm bg-[#006466] border border-gray-500 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#eef4ed] text-white"></textarea>
                           <div className="flex justify-end space-x-2 mt-2">
                                <button type="button" onClick={() => setShowReplyForm(false)} className="px-3 py-1 text-sm font-semibold rounded-md hover:bg-gray-700 text-gray-200">Cancel</button>
                                <button type="submit" disabled={isReplying} className="px-3 py-1 text-sm font-semibold rounded-md bg-[#006466] text-white hover:bg-opacity-80 disabled:bg-opacity-60">
                                    {isReplying ? 'Posting...' : 'Reply'}
                                </button>
                           </div>
                        </div>
                    </form>
                )}
                {children}
            </div>
        </div>
    );
};

const CommentThread = ({ review, db, currentUser, actorId }) => {
    const [replies, setReplies] = useState([]);
    const [showReplies, setShowReplies] = useState(false);

    useEffect(() => {
        if (!db || !actorId || !review.id) return;
        const repliesRef = collection(db, "artifacts", appId, `public/data/actors/${actorId}/reviews`, review.id, 'replies');
        const q = query(repliesRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const repliesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, isReply: true, parentId: review.id }));
            setReplies(repliesData);
        });
        return () => unsubscribe();
    }, [db, actorId, review.id]);

    const topLevelComment = {
        id: review.id,
        title: review.reviewTitle,
        text: review.reviewText,
        username: review.username,
        userId: review.userId,
        viewedMovies: review.viewedMovies,
        isReply: false
    };

    const firstReply = replies.length > 0 ? replies[0] : null;
    const otherReplies = replies.length > 1 ? replies.slice(1) : [];

    return (
        <Comment comment={topLevelComment} db={db} currentUser={currentUser} actorId={actorId}>
             <div className="mt-3 space-y-4 pl-6 border-l-2 border-gray-500">
                {firstReply && <Comment key={firstReply.id} comment={firstReply} db={db} currentUser={currentUser} actorId={actorId} />}
                {showReplies && otherReplies.map(reply => <Comment key={reply.id} comment={reply} db={db} currentUser={currentUser} actorId={actorId}/>)}
             </div>
             {otherReplies.length > 0 && (
                <button onClick={() => setShowReplies(!showReplies)} className="mt-2 ml-3 text-sm font-bold text-[#eef4ed] hover:underline">
                    {showReplies ? 'Hide replies' : `View ${otherReplies.length} more ${otherReplies.length === 1 ? 'reply' : 'replies'}`}
                </button>
             )}
        </Comment>
    );
};


// --- Main Application Components ---

const ActorCard = ({ actor, onSelect, averageScores }) => (
    <div 
        className="bg-[#2c7da0] rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group"
        onClick={() => onSelect(actor)}
    >
        <div className="relative h-56">
            <img 
                src={actor.imageUrl} 
                alt={actor.name} 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x600/374151/e5e7eb?text=${actor.name.split(' ').join('+')}`; }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-20 transition-all duration-300"></div>
            <div className="absolute bottom-0 left-0 p-4">
                <h3 className="text-2xl font-bold text-white tracking-wide">{actor.name}</h3>
            </div>
        </div>
        <div className="p-4 text-white">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Score</span>
                <span className={`text-2xl font-bold ${averageScores.overall >= 75 ? 'text-green-400' : averageScores.overall >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {averageScores.overall.toFixed(1)}
                </span>
            </div>
             <div className="w-full bg-gray-500 rounded-full h-2.5 mt-2">
                <div className="bg-[#4d194d] h-2.5 rounded-full" style={{ width: `${averageScores.overall}%` }}></div>
            </div>
        </div>
    </div>
);

const AddActorForm = ({ db, actors }) => {
    const [name, setName] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [birthdate, setBirthdate] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleNameChange = (e) => {
        const value = e.target.value;
        setName(value);

        if (value.length > 1) {
            const filteredSuggestions = actors.filter(actor =>
                actor.name.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 5); // Limit suggestions to 5
            setSuggestions(filteredSuggestions);
        } else {
            setSuggestions([]);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 500 * 1024) {
                setError('Image size must be less than 500KB.');
                setImageFile(null);
                setImagePreview('');
                return;
            }
            setError('');
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Actor name is required.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const actorsRef = collection(db, "artifacts", appId, "public/data/actors");
            const q = query(actorsRef, where("name", "==", name.trim()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setError('An actor with this name already exists.');
                setIsLoading(false);
                return;
            }
            
            let imageDataUrl = `https://placehold.co/400x600/374151/e5e7eb?text=${name.trim().split(' ').join('+')}`;
            if (imageFile) {
                imageDataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(imageFile);
                });
            }

            const newActor = { 
                name: name.trim(), 
                birthdate,
                imageUrl: imageDataUrl, 
                createdAt: Timestamp.now() 
            };
            await addDoc(actorsRef, newActor);
            setName('');
            setBirthdate('');
            setImageFile(null);
            setImagePreview('');
            setSuggestions([]);

        } catch (err) {
            console.error("Error adding actor: ", err);
            setError('Failed to add actor. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-[#2c7da0] p-6 rounded-xl shadow-md mb-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Add a New Actor/Actress</h2>
            <form onSubmit={handleSubmit}>
                 <div className="mb-4 relative">
                    <label htmlFor="actorName" className="block text-sm font-medium mb-1">Full Name</label>
                    <input id="actorName" type="text" value={name} onChange={handleNameChange} placeholder="e.g., Meryl Streep" className="w-full px-3 py-2 bg-[#006466] border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#eef4ed]" required autoComplete="off" />
                    {suggestions.length > 0 && (
                        <ul className="absolute z-10 w-full bg-[#006466] border border-gray-500 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                            {suggestions.map(suggestion => (
                                <li key={suggestion.id} className="px-3 py-2 cursor-pointer hover:bg-[#4d194d]"
                                    onClick={() => {
                                        setName(suggestion.name);
                                        setSuggestions([]);
                                    }}>
                                    {suggestion.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                 <div className="mb-4">
                    <label htmlFor="birthdate" className="block text-sm font-medium mb-1">Birthdate</label>
                    <input id="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className="w-full px-3 py-2 bg-[#006466] border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#eef4ed]" />
                </div>
                <div className="mb-4">
                    <label htmlFor="imageUpload" className="block text-sm font-medium mb-1">Profile Picture</label>
                    <input id="imageUpload" type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#eef4ed] file:text-[#001219] hover:file:bg-opacity-80" />
                    <p className="text-xs text-gray-300 mt-1">Max file size: 500KB.</p>
                </div>
                {imagePreview && (
                    <div className="mb-4">
                        <p className="text-sm font-medium mb-1">Image Preview:</p>
                        <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-md shadow-sm"/>
                    </div>
                )}
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <button type="submit" disabled={isLoading} className="w-full bg-[#006466] text-white font-bold py-2 px-4 rounded-md hover:bg-opacity-80 disabled:bg-opacity-60 transition-colors duration-300">
                    {isLoading ? 'Adding...' : 'Add Actor'}
                </button>
            </form>
        </div>
    );
};

const RatingForm = ({ db, actor, userId, username, existingScores }) => {
    const categories = {
        emotionalRange: { label: 'Emotional Range', explanation: 'The ability to portray a wide spectrum of feelings authentically.' },
        vocalDelivery: { label: 'Vocal Delivery', explanation: 'Clarity, projection, and emotional tone of voice.' },
        physicality: { label: 'Physicality & Movement', explanation: 'How an actor uses their body, posture, and gestures to build a character.' },
        screenPresence: { label: 'Screen Presence', explanation: 'The magnetic quality that captures and holds the audience\'s attention.' },
        consistency: { label: 'Consistency', explanation: 'Delivering a believable performance repeatedly across different takes and scenes.' },
        timingAndPacing: { label: 'Timing and Pacing', explanation: 'Delivering lines and actions at the right moment for impact.' },
        chemistry: { label: 'Chemistry', explanation: 'The believable, compelling dynamic with scene partners.' }
    };
    
    const initialRatings = { emotionalRange: 50, vocalDelivery: 50, physicality: 50, screenPresence: 50, consistency: 50, timingAndPacing: 50, chemistry: 50 };

    const [ratings, setRatings] = useState(initialRatings);
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewText, setReviewText] = useState('');
    const [viewedMovies, setViewedMovies] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (existingScores) {
            setRatings(existingScores.ratings || initialRatings);
        } else {
            setRatings(initialRatings);
        }
    }, [existingScores]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');

        // 1. Update the user's numerical rating
        const overallScore = Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length;
        const userRatingData = { ratings, overallScore };
        const userRatingRef = doc(db, "artifacts", appId, `public/data/actors/${actor.id}/userRatings`, userId);

        try {
            await setDoc(userRatingRef, userRatingData);
            
            // 2. If there's a review, post it as a new document
            if (reviewText.trim() || reviewTitle.trim()) {
                const reviewData = {
                    userId,
                    username,
                    reviewTitle,
                    reviewText,
                    viewedMovies,
                    createdAt: Timestamp.now(),
                    likes: [],
                    dislikes: [],
                    voteScore: 0
                };
                const reviewsRef = collection(db, "artifacts", appId, `public/data/actors/${actor.id}/reviews`);
                await addDoc(reviewsRef, reviewData);
                
                // Clear review fields after posting
                setReviewTitle('');
                setReviewText('');
                setViewedMovies('');
                setMessage('Rating updated and review posted!');
            } else {
                 setMessage('Rating updated!');
            }

        } catch (err) {
            console.error("Error submitting rating/review: ", err);
            setMessage('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-[#2c7da0] p-6 rounded-xl shadow-md mt-8 text-white">
            <h3 className="text-xl font-bold mb-4">Update Your Rating & Post a New Review</h3>
            <form onSubmit={handleSubmit}>
                {Object.entries(categories).map(([key, {label, explanation}]) => (
                    <div className="mb-4" key={key}>
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center space-x-1">
                                <label className="text-sm font-medium">{label}</label>
                                <Tooltip text={explanation}>
                                    <span className="text-[#eef4ed] cursor-pointer text-xs font-bold">ⓘ</span>
                                </Tooltip>
                            </div>
                            <span className="text-sm font-bold text-[#eef4ed]">{ratings[key]}</span>
                        </div>
                        <input type="range" min="1" max="100" value={ratings[key]} onChange={(e) => setRatings(prev => ({ ...prev, [key]: Number(e.target.value)}))} className="w-full h-2 bg-gray-500 rounded-lg appearance-none cursor-pointer" />
                    </div>
                ))}
                 <div className="mt-6">
                    <label htmlFor="viewedMovies" className="block text-sm font-medium mb-1">Movies/Shows Viewed (optional)</label>
                    <input id="viewedMovies" type="text" value={viewedMovies} onChange={(e) => setViewedMovies(e.target.value)} placeholder="e.g. The Devil Wears Prada, The Iron Lady" className="w-full px-3 py-2 bg-[#006466] border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#eef4ed]" />
                </div>
                <div className="mt-4">
                    <label htmlFor="reviewTitle" className="block text-sm font-medium mb-1">New Review Title (Optional)</label>
                    <input id="reviewTitle" type="text" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="A catchy title for your review" className="w-full px-3 py-2 bg-[#006466] border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#eef4ed]" />
                </div>
                <div className="mt-4">
                    <label htmlFor="review" className="block text-sm font-medium mb-1">New Review Text (Optional)</label>
                    <textarea id="review" rows="4" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="What do you think of their acting?" className="w-full px-3 py-2 bg-[#006466] border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#eef4ed]"></textarea>
                </div>
                 {message && <p className="text-green-400 text-sm mt-4">{message}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-[#006466] text-white font-bold py-2 px-4 rounded-md hover:bg-opacity-80 disabled:bg-opacity-60 transition-colors duration-300">
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
            </form>
        </div>
    );
};

const ScoreDisplay = ({ label, score }) => (
    <div className="flex items-center justify-between py-3">
        <p className="text-white">{label}</p>
        <div className="flex items-center space-x-3">
            <div className="w-48 bg-gray-500 rounded-full h-2.5">
                <div className="bg-[#4d194d] h-2.5 rounded-full" style={{ width: `${score}%` }}></div>
            </div>
            <p className="font-bold w-12 text-right text-white">{score.toFixed(1)}</p>
        </div>
    </div>
);

const ActorProfile = ({ actor, onBack, db, user, userProfile }) => {
    const [reviews, setReviews] = useState([]);
    const [userRatings, setUserRatings] = useState([]);
    
    useEffect(() => {
        if (!actor) return;
        const reviewsRef = collection(db, "artifacts", appId, `public/data/actors/${actor.id}/reviews`);
        const q = query(reviewsRef, orderBy('voteScore', 'desc'));
        const unsubscribeReviews = onSnapshot(q, (querySnapshot) => {
            const reviewsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setReviews(reviewsData);
        }, (error) => console.error("Error fetching reviews:", error));
        
        const userRatingsRef = collection(db, "artifacts", appId, `public/data/actors/${actor.id}/userRatings`);
        const unsubscribeUserRatings = onSnapshot(userRatingsRef, (querySnapshot) => {
             const ratingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             setUserRatings(ratingsData);
        }, (error) => console.error("Error fetching user ratings:", error));


        return () => {
            unsubscribeReviews();
            unsubscribeUserRatings();
        };
    }, [actor, db]);

    const calculateAge = (birthdate) => {
        if (!birthdate) return null;
        const birthDate = new Date(birthdate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };
    
    const age = calculateAge(actor.birthdate);

    const averageScores = useMemo(() => {
        const initialScores = { emotionalRange: 0, vocalDelivery: 0, physicality: 0, screenPresence: 0, consistency: 0, timingAndPacing: 0, chemistry: 0, overall: 0 };
        if (userRatings.length === 0) return initialScores;
        
        const totalOverall = userRatings.reduce((acc, rating) => acc + (rating.overallScore || 0), 0);
        const totalIndividual = userRatings.reduce((acc, ratingDoc) => {
            const userRating = ratingDoc.ratings;
            if (userRating) {
                Object.keys(acc).forEach(key => {
                    acc[key] += userRating[key] || 0;
                });
            }
            return acc;
        }, {...initialScores});

        const count = userRatings.length;
        
        const finalAverages = {};
        for (const key in totalIndividual) {
            finalAverages[key] = totalIndividual[key] / count;
        }
        finalAverages.overall = totalOverall / count;
        
        return finalAverages;
    }, [userRatings]);
    
    const userScores = useMemo(() => userRatings.find(r => r.id === user.uid), [userRatings, user.uid]);

    return (
        <div>
            <button onClick={onBack} className="mb-6 bg-[#eef4ed] text-[#001219] font-bold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">&larr; Back to Actor List</button>
            <div className="bg-[#2c7da0] text-white rounded-xl shadow-xl overflow-hidden">
                <div className="md:flex">
                    <div className="md:flex-shrink-0">
                        <img className="h-64 w-full object-cover md:w-64" src={actor.imageUrl} alt={actor.name} onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x600/374151/e5e7eb?text=${actor.name.split(' ').join('+')}`; }} />
                    </div>
                    <div className="p-8 flex-grow">
                        <h1 className="text-4xl font-extrabold tracking-tight">{actor.name}</h1>
                        {actor.birthdate && <p className="mt-1 text-md text-gray-300">Born: {actor.birthdate} {age !== null && `(Age ${age})`}</p>}
                        <p className="mt-2 text-gray-300">Community Acting Score</p>
                        <div className="mt-4">
                            <div className="flex items-baseline space-x-2">
                                <p className="text-6xl font-bold text-[#eef4ed]">{averageScores.overall.toFixed(1)}</p>
                                <p className="text-xl text-gray-300">/ 100</p>
                            </div>
                            <p className="text-sm text-gray-300">Based on {userRatings.length} {userRatings.length === 1 ? 'rating' : 'ratings'}</p>
                        </div>
                    </div>
                </div>
                 <div className="px-8 py-6 border-t border-gray-500">
                    <h3 className="text-lg font-bold">Score Breakdown</h3>
                    <div className="mt-4 divide-y divide-gray-500">
                        {Object.entries(averageScores).filter(([key]) => key !== 'overall').map(([key, score]) => (
                             <ScoreDisplay key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} score={score} />
                        ))}
                    </div>
                </div>
            </div>
            <RatingForm db={db} actor={actor} userId={user.uid} username={userProfile.username} existingScores={userScores} />
            <div className="mt-8">
                 <h2 className="text-2xl font-bold mb-4 text-[#001219]">Community Reviews ({reviews.length})</h2>
                 <div className="space-y-6">
                    {reviews.length > 0 ? (
                        reviews.map(review => (
                            <CommentThread key={review.id} review={review} db={db} currentUser={userProfile} actorId={actor.id} />
                        ))
                    ) : (
                        <p className="text-gray-500">No reviews yet. Be the first to write one!</p>
                    )}
                 </div>
            </div>
        </div>
    );
};

const UserProfilePage = ({ userProfile, auth, db, onBack }) => {
    const [bio, setBio] = useState(userProfile.bio || '');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(userProfile.profilePictureUrl || '');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [reviewedActors, setReviewedActors] = useState([]);

    useEffect(() => {
        // This complex query is disabled to prevent permissions errors.
        // A scalable solution would require denormalizing data (e.g., storing reviewed actor IDs on the user profile).
    }, [db, userProfile.uid]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 500 * 1024) {
                setMessage('Image size must be less than 500KB.');
                setImageFile(null);
                return;
            }
            setMessage('');
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        const userProfileRef = doc(db, "artifacts", appId, "public/data/users", userProfile.uid);
        let profilePictureUrl = userProfile.profilePictureUrl;

        try {
            if (imageFile) {
                 profilePictureUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(imageFile);
                });
            }

            await updateDoc(userProfileRef, {
                bio,
                profilePictureUrl
            });
            setMessage('Profile updated successfully!');

        } catch (err) {
            console.error("Profile update error:", err);
            setMessage("Failed to update profile.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
             <button onClick={onBack} className="mb-6 bg-[#006466] text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">&larr; Back to Main</button>
            <div className="bg-[#2c7da0] text-white rounded-xl shadow-xl p-8">
                <h1 className="text-3xl font-bold mb-6">Edit Your Profile</h1>
                
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="flex items-center space-x-6">
                        <img src={imagePreview} alt="Profile" className="w-24 h-24 object-cover rounded-full shadow-md" />
                        <div>
                            <label htmlFor="profilePicture" className="block text-sm font-medium">Update Profile Picture</label>
                            <input id="profilePicture" type="file" accept="image/*" onChange={handleImageChange} className="mt-1 w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#eef4ed] file:text-[#001219] hover:file:bg-opacity-80"/>
                             <p className="text-xs text-gray-300 mt-1">Max file size: 500KB.</p>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium">Your Bio</label>
                        <textarea id="bio" rows="4" value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1 w-full p-2 bg-[#006466] border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#eef4ed]" placeholder="Tell us a little about yourself..."></textarea>
                    </div>
                    {message && <p className="text-green-400 text-sm">{message}</p>}
                    <button type="submit" disabled={isLoading} className="w-full bg-[#006466] text-white font-bold py-2 px-4 rounded-md hover:bg-opacity-80 disabled:bg-opacity-60 transition-colors duration-300">
                        {isLoading ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>

                <div className="mt-10 border-t border-gray-500 pt-6">
                    <h2 className="text-2xl font-bold mb-4">Actors You've Reviewed</h2>
                    <p className="text-sm text-gray-300 mb-4">Note: This feature is currently in development and may not display all reviewed actors.</p>
                     {reviewedActors.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {reviewedActors.map(actor => (
                                <div key={actor.id} className="text-center">
                                    <img src={actor.imageUrl} alt={actor.name} className="w-24 h-24 mx-auto rounded-full object-cover shadow-md" />
                                    <p className="mt-2 text-sm font-semibold">{actor.name}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400">You haven't rated any actors yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const TrendingPage = ({ db, onActorSelect, onBack }) => {
    const [trendingActors, setTrendingActors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTrendingData = async () => {
            setIsLoading(true);
            const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
            const actorsRef = collection(db, "artifacts", appId, "public/data/actors");
            const actorsSnapshot = await getDocs(actorsRef);
            const actorsData = actorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const trendingDataPromises = actorsData.map(async (actor) => {
                const reviewsRef = collection(db, "artifacts", appId, `public/data/actors/${actor.id}/reviews`);
                const q = query(reviewsRef, where('createdAt', '>=', sevenDaysAgo));
                const reviewsSnapshot = await getDocs(q);
                return { ...actor, trendingScore: reviewsSnapshot.size };
            });

            const resolvedTrendingData = await Promise.all(trendingDataPromises);
            const sortedTrending = resolvedTrendingData
                .filter(actor => actor.trendingScore > 0)
                .sort((a, b) => b.trendingScore - a.trendingScore);

            setTrendingActors(sortedTrending);
            setIsLoading(false);
        };

        fetchTrendingData();
    }, [db]);

    return (
        <div>
            <button onClick={onBack} className="mb-6 bg-[#006466] text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">&larr; Back to Main</button>
            <div className="bg-[#2c7da0] text-white rounded-xl shadow-xl p-8">
                <h1 className="text-3xl font-bold mb-2">Trending Actors</h1>
                <p className="text-gray-300 mb-6">Actors with the most reviews in the last 7 days.</p>
                {isLoading ? (
                    <p>Calculating trending actors...</p>
                ) : (
                    <div className="space-y-4">
                        {trendingActors.length > 0 ? trendingActors.map((actor, index) => (
                            <div key={actor.id} onClick={() => onActorSelect(actor)} className="flex items-center p-3 bg-[#006466] rounded-lg cursor-pointer hover:bg-[#4d194d] transition-colors">
                                <span className="text-xl font-bold text-gray-400 w-8">{index + 1}</span>
                                <img src={actor.imageUrl} alt={actor.name} className="w-12 h-12 rounded-full object-cover mx-4"/>
                                <div className="flex-grow">
                                    <p className="font-bold">{actor.name}</p>
                                    <p className="text-sm text-[#eef4ed]">{actor.trendingScore} new reviews</p>
                                </div>
                            </div>
                        )) : (
                            <p>No trending activity in the last 7 days.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const SearchPage = ({ db, onActorSelect, onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState({ actors: [], users: [], reviews: [] });
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        setIsLoading(true);
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        // Fetch all actors and users first
        const actorsRef = collection(db, "artifacts", appId, "public/data/actors");
        const actorsSnapshot = await getDocs(actorsRef);
        const allActors = actorsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        
        const usersRef = collection(db, "artifacts", appId, "public/data/users");
        const usersSnapshot = await getDocs(usersRef);
        const allUsers = usersSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        
        // Filter actors and users client-side
        const actorResults = allActors.filter(actor => actor.name.toLowerCase().includes(lowerCaseSearchTerm));
        const userResults = allUsers.filter(user => user.username.toLowerCase().includes(lowerCaseSearchTerm));

        setResults({ actors: actorResults, users: userResults, reviews: [] }); // Reviews search disabled
        setIsLoading(false);
    };

    return (
        <div>
            <button onClick={onBack} className="mb-6 bg-[#006466] text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">&larr; Back to Main</button>
            <div className="bg-[#2c7da0] text-white rounded-xl shadow-xl p-8">
                <h1 className="text-3xl font-bold mb-6">Search</h1>
                <form onSubmit={handleSearch} className="flex space-x-2 mb-8">
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search for actors or users..." className="w-full px-4 py-2 bg-[#006466] border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#eef4ed]" />
                    <button type="submit" className="bg-[#006466] text-white font-bold py-2 px-6 rounded-md hover:bg-opacity-80">Search</button>
                </form>

                {isLoading ? <p>Searching...</p> : (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold mb-4">Actors ({results.actors.length})</h2>
                            {results.actors.length > 0 ? (
                                results.actors.map(actor => (
                                    <div key={actor.id} onClick={() => onActorSelect(actor)} className="flex items-center p-3 hover:bg-[#4d194d] rounded-lg cursor-pointer">
                                        <img src={actor.imageUrl} alt={actor.name} className="w-12 h-12 rounded-full object-cover mr-4" />
                                        <p className="font-semibold">{actor.name}</p>
                                    </div>
                                ))
                            ) : <p className="text-gray-300">No actors found.</p>}
                        </div>
                        <div>
                             <h2 className="text-2xl font-bold mb-4">Users ({results.users.length})</h2>
                             {results.users.length > 0 ? (
                                results.users.map(user => (
                                     <div key={user.id} className="flex items-center p-3 hover:bg-[#4d194d] rounded-lg cursor-pointer">
                                         <img src={user.profilePictureUrl} alt={user.username} className="w-12 h-12 rounded-full object-cover mr-4" />
                                         <p className="font-semibold">{user.username}</p>
                                     </div>
                                 ))
                            ) : <p className="text-gray-300">No users found.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


const MainContent = ({ user, userProfile, auth, db }) => {
    const [actors, setActors] = useState([]);
    const [actorScores, setActorScores] = useState({});
    const [selectedActor, setSelectedActor] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('home'); // 'home', 'profile', 'trending', 'search', 'forum', 'admin'
    const [homeSearchTerm, setHomeSearchTerm] = useState('');

    useEffect(() => {
        setIsLoading(true);
        const actorsRef = collection(db, "artifacts", appId, "public/data/actors");
        const q = query(actorsRef);
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const actorsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setActors(actorsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching actors:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [db]);

     useEffect(() => {
        const unsubscribers = actors.map(actor => {
            const userRatingsRef = collection(db, "artifacts", appId, `public/data/actors/${actor.id}/userRatings`);
            return onSnapshot(userRatingsRef, (ratingSnapshot) => {
                const ratingsData = ratingSnapshot.docs.map(doc => doc.data());
                setActorScores(prev => ({ ...prev, [actor.id]: ratingsData }));
            });
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, [actors, db]);

    const calculatedAverages = useMemo(() => {
        const averages = {};
        for (const actorId in actorScores) {
            const scores = actorScores[actorId];
            if (scores.length > 0) {
                const total = scores.reduce((acc, r) => acc + r.overallScore, 0);
                averages[actorId] = { overall: total / scores.length };
            } else {
                averages[actorId] = { overall: 0 };
            }
        }
        return averages;
    }, [actorScores]);
    
    const filteredActors = useMemo(() => actors.filter(actor => actor.name.toLowerCase().includes(homeSearchTerm.toLowerCase())), [actors, homeSearchTerm]);

    const handleSignOut = async () => {
        await signOut(auth);
    };
    
    const renderPage = () => {
        switch (currentPage) {
            case 'profile':
                return <UserProfilePage userProfile={userProfile} auth={auth} db={db} onBack={() => setCurrentPage('home')} />;
            case 'trending':
                return <TrendingPage db={db} onActorSelect={(actor) => { setSelectedActor(actor); setCurrentPage('home'); }} onBack={() => setCurrentPage('home')} />;
            case 'search':
                return <SearchPage db={db} onActorSelect={(actor) => { setSelectedActor(actor); setCurrentPage('home'); }} onBack={() => setCurrentPage('home')} />
            case 'forum':
                return <ForumPage db={db} userProfile={userProfile} onBack={() => setCurrentPage('home')} />;
             case 'admin':
                return <AdminPage db={db} currentUser={userProfile} onBack={() => setCurrentPage('home')} />;
            case 'home':
            default:
                 return !selectedActor ? (
                    <>
                        <div className="mb-8">
                           <input
                               type="text"
                               placeholder="Filter actors by name..."
                               value={homeSearchTerm}
                               onChange={(e) => setHomeSearchTerm(e.target.value)}
                               className="w-full px-4 py-3 bg-[#2c7da0] border border-gray-500 rounded-lg text-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#eef4ed]"
                           />
                        </div>
                        <AddActorForm db={db} actors={actors} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filteredActors.sort((a,b) => a.name.localeCompare(b.name)).map(actor => (
                                <ActorCard key={actor.id} actor={actor} onSelect={setSelectedActor} averageScores={calculatedAverages[actor.id] || { overall: 0 }}/>
                            ))}
                        </div>
                    </>
                ) : (
                    <ActorProfile actor={selectedActor} onBack={() => setSelectedActor(null)} db={db} user={user} userProfile={userProfile} />
                );
        }
    }

    return (
         <div className="bg-white min-h-screen font-sans text-[#001219]">
            <header className="bg-[#4d194d] shadow-md sticky top-0 z-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight cursor-pointer" onClick={() => {setSelectedActor(null); setCurrentPage('home');}}>
                            C<span className="text-[#eef4ed]">Actis</span>
                        </h1>
                        <p className="text-sm text-gray-200">Welcome, {userProfile.username}!</p>
                    </div>
                     <div className="flex items-center space-x-4">
                        <button onClick={() => setCurrentPage('search')} title="Search" className="p-2 rounded-full hover:bg-black hover:bg-opacity-20">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </button>
                        <button onClick={() => setCurrentPage('forum')} className="font-semibold text-white hover:text-[#eef4ed]">Forum</button>
                        <button onClick={() => setCurrentPage('trending')} className="font-semibold text-white hover:text-[#eef4ed]">Trending</button>
                        <button onClick={() => setCurrentPage('profile')} className="font-semibold text-white hover:text-[#eef4ed]">My Profile</button>
                        {user.uid === ADMIN_UID && <button onClick={() => setCurrentPage('admin')} className="font-semibold text-yellow-300 hover:text-yellow-200">Admin</button>}
                        <button onClick={handleSignOut} className="bg-[#006466] text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">
                            Sign Out
                        </button>
                     </div>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {isLoading ? <p>Loading...</p> : renderPage()}
            </main>
        </div>
    );
}

const ForumPage = ({ db, userProfile, onBack }) => {
    const [posts, setPosts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "artifacts", appId, "public/data/forum"), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPosts(postsData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [db]);

    const handleNewPost = async (title, content) => {
        if (!title.trim() || !content.trim()) return;

        const newPost = {
            title: title,
            content: content,
            userId: userProfile.uid,
            username: userProfile.username,
            createdAt: Timestamp.now(),
            likes: [],
            dislikes: [],
            voteScore: 0,
        };

        await addDoc(collection(db, "artifacts", appId, "public/data/forum"), newPost);
        setIsModalOpen(false);
    };

    const parseContent = (content) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const imageRegex = /\.(jpeg|jpg|gif|png)$/i;
        const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        
        return content.split(/(\s+)/).map((part, index) => {
            const youtubeMatch = part.match(youtubeRegex);
            if (youtubeMatch) {
                const videoId = youtubeMatch[1];
                return <div key={index} className="my-4"><iframe className="w-full aspect-video rounded-lg" src={`https://www.youtube.com/embed/${videoId}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div>;
            }
            if(part.match(urlRegex) && part.match(imageRegex)) {
                return <img key={index} src={part} alt="User content" className="max-w-full my-2 rounded-lg" />;
            }
             if (part.match(urlRegex)) {
                 return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-[#eef4ed] hover:underline">{part}</a>
             }
            return <span key={index}>{part}</span>;
        });
    };


    return (
        <div>
             <div className="sticky top-[88px] bg-white z-10 py-3 mb-4 border-b border-gray-200">
                 <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-[#001219]">Community Forum</h1>
                    <button onClick={() => setIsModalOpen(true)} className="bg-[#006466] text-white font-bold py-2 px-4 rounded-md hover:bg-opacity-80">Create a New Post</button>
                </div>
            </div>
            
            {isModalOpen && <NewPostModal onPost={handleNewPost} userProfile={userProfile} onClose={() => setIsModalOpen(false)} />}
            
            {isLoading ? <p>Loading posts...</p> : (
                <div className="space-y-8">
                    {posts.map(post => (
                       <div key={post.id} className="bg-[#2c7da0] rounded-xl shadow-md p-6 text-white">
                           <p className="text-xs text-gray-300">Posted by {post.username} on {post.createdAt.toDate().toLocaleDateString()}</p>
                           <h3 className="text-2xl font-bold my-2">{post.title}</h3>
                           <div className="text-gray-200 prose max-w-none">
                               {parseContent(post.content)}
                           </div>
                           <div className="mt-4 flex items-center space-x-4">
                              <VoteButtons docRef={doc(db, "artifacts", appId, "public/data/forum", post.id)} db={db} currentUser={userProfile} />
                           </div>
                       </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const NewPostModal = ({ onPost, userProfile, onClose }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const videoInputRef = React.useRef(null);
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onPost(title, content);
    };

    const addLink = (type) => {
        const url = prompt(`Enter the ${type} URL:`);
        if (url) {
            setContent(prev => `${prev}\n${url}`);
        }
    };
    
    const handleVideoFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const blobUrl = URL.createObjectURL(file);
            setContent(prev => `${prev}\n[VIDEO_PLAYER:${blobUrl}]`);
            alert("Note: Uploaded videos are only viewable on your device and will not be shared with other users.");
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center p-4">
            <div className="bg-[#2c7da0] text-white rounded-xl shadow-2xl p-8 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Create a New Post</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                     <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Post Title" className="w-full mb-4 p-3 bg-[#006466] border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#eef4ed]" required />
                    <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What's on your mind? You can paste links or use the buttons below." rows="8" className="w-full p-3 bg-[#006466] border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#eef4ed]" required></textarea>
                    
                    <div className="flex items-center space-x-2 mt-2 border-t pt-2 border-gray-500">
                       <button type="button" onClick={() => addLink('YouTube')} title="Add YouTube Video" className="p-2 hover:bg-gray-700 rounded-md">📺</button>
                       <button type="button" onClick={() => addLink('Image/GIF')} title="Add Image/GIF" className="p-2 hover:bg-gray-700 rounded-md">🖼️</button>
                       <button type="button" onClick={() => videoInputRef.current.click()} title="Embed Video from Device" className="p-2 hover:bg-gray-700 rounded-md">📹</button>
                       <button type="button" onClick={() => addLink('Link')} title="Add Link" className="p-2 hover:bg-gray-700 rounded-md">🔗</button>
                       <input type="file" ref={videoInputRef} onChange={handleVideoFileChange} accept="video/*" className="hidden" />
                    </div>

                    <div className="flex justify-end mt-4">
                        <button type="submit" className="bg-[#006466] text-white font-bold py-2 px-6 rounded-md hover:bg-opacity-80">Post</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- App ---

function App() {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [authStatus, setAuthStatus] = useState('loading'); // 'loading', 'unauthenticated', 'authenticated'

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestoreDb);
            setAuth(firebaseAuth);
        } catch (e) {
            console.error("Firebase initialization error:", e);
        }
    }, []);

    useEffect(() => {
        if (!auth || !db) return;

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser && !currentUser.isAnonymous) {
                setUser(currentUser);
                const userProfileRef = doc(db, "artifacts", appId, "public/data/users", currentUser.uid);

                const unsubscribeProfile = onSnapshot(userProfileRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const profileData = docSnap.data();
                        if (profileData.isSuspended) {
                             signOut(auth);
                             alert("Your account has been suspended.");
                        } else {
                            setUserProfile({uid: currentUser.uid, ...profileData});
                            setAuthStatus('authenticated');
                        }
                    } else {
                         setAuthStatus('loading');
                    }
                });
                
                return () => unsubscribeProfile();

            } else {
                setUser(null);
                setUserProfile(null);
                setAuthStatus('unauthenticated');
            }
        });
        return () => unsubscribeAuth();
    }, [auth, db]);

    if (authStatus === 'loading') {
        return <div className="min-h-screen bg-white flex items-center justify-center"><p className="text-[#001219]">Loading App...</p></div>;
    }
    
    if (authStatus === 'unauthenticated') {
        return <AuthPage auth={auth} db={db} />;
    }

    if (authStatus === 'authenticated') {
        if (!userProfile) { 
             return <div className="min-h-screen bg-white flex items-center justify-center"><p className="text-[#001219]">Loading Profile...</p></div>;
        }
        return <MainContent user={user} userProfile={userProfile} auth={auth} db={db} />;
    }
    
    return <div className="min-h-screen bg-white flex items-center justify-center"><p className="text-red-500">An unexpected error occurred. Please refresh the page.</p></div>;
}

export default App;
