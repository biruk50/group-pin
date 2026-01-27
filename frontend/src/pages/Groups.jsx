import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./groups.css";

export default function Groups() {
    const [groups, setGroups] = useState([]);
    const [invites, setInvites] = useState([]);
    const [name, setName] = useState("");
    const [inviteUser, setInviteUser] = useState("");
    const [selected, setSelected] = useState(null);
    const [selectedDetail, setSelectedDetail] = useState(null);
    const navigate = useNavigate();
    const [user] = useState(() => window.localStorage.getItem("user"));

    useEffect(() => {
        if (!user) return;
        const fetch = async () => {
            try {
                const res = await axios.get(`/groups?username=${user}`);
                setGroups(res.data || []);
                const inv = await axios.get(`/groups/invites?username=${user}`);
                setInvites(inv.data || []);
            } catch (err) {
                console.log(err);
            }
        };
        fetch();
    }, [user]);

    const createGroup = async (e) => {
        e.preventDefault();
        if (!name) return;
        try {
            const res = await axios.post("/groups", { name, owner: user });
            setGroups((p) => [res.data, ...p]);
            setName("");
        } catch (err) {
            console.log(err);
        }
    };

    const invite = async (e) => {
        e.preventDefault();
        if (!selected) return;
        try {
            await axios.post(`/groups/${selected}/invite`, { username: inviteUser });
            setInviteUser("");
            alert('Invite sent');
        } catch (err) {
            console.log(err);
        }
    };

    const selectGroup = async (g) => {
        setSelected(g._id);
        try {
            const res = await axios.get(`/groups/${g._id}`);
            setSelectedDetail(res.data);
        } catch (err) {
            console.log(err);
            setSelectedDetail(null);
        }
    };

    const openGroupMap = (g) => {
        setSelected(g._id);
        window.localStorage.setItem("activeGroup", g._id);
        // indicate the map was opened from the Groups page so App can zoom into first pin
        window.localStorage.setItem("openFromGroup", g._id);
        window.dispatchEvent(new CustomEvent("activeGroupChanged", { detail: g._id }));
        navigate("/map");
    };

    const acceptInvite = async (groupId) => {
        try {
            await axios.post(`/groups/${groupId}/accept`, { username: user });
            // refresh lists
            const res = await axios.get(`/groups?username=${user}`);
            setGroups(res.data || []);
            const inv = await axios.get(`/groups/invites?username=${user}`);
            setInvites(inv.data || []);
        } catch (err) { console.log(err); }
    };

    const declineInvite = async (groupId) => {
        try {
            await axios.post(`/groups/${groupId}/decline`, { username: user });
            const inv = await axios.get(`/groups/invites?username=${user}`);
            setInvites(inv.data || []);
        } catch (err) { console.log(err); }
    };

    const leaveGroup = async (groupId) => {
        if (!window.confirm("Leave group?")) return;
        try {
            await axios.post(`/groups/${groupId}/leave`, { username: user });
            const res = await axios.get(`/groups?username=${user}`);
            setGroups(res.data || []);
            setSelected(null);
            setSelectedDetail(null);
        } catch (err) { console.log(err); }
    };

    return (
        <div className="groupsPage">
            <aside className="sidebar">
                <div className="sidebarHeader">
                    <div className="brand">Group Pin</div>
                    <div className="headerActions">
                        <button className="homeBtn" onClick={() => navigate("/login")}>Back</button>
                    </div>
                </div>

                <div className="createBox">
                    <form onSubmit={createGroup} className="createForm">
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Create new group" />
                        <button type="submit">Create</button>
                    </form>
                </div>

                <div className="listWrap">
                    <ul className="groupList">
                        {groups.map((g) => (
                            <li
                                key={g._id}
                                className={`groupItem ${selected === g._id ? "active" : ""}`}
                                onClick={() => selectGroup(g)}
                            >
                                <div className="groupAvatar">{g.name?.charAt(0)?.toUpperCase() || "G"}</div>
                                <div className="groupInfo">
                                    <div className="groupName">{g.name}</div>
                                    <div className="groupMeta">{(g.members?.length || 0) + " members"}</div>
                                </div>
                            </li>
                        ))}
                        {groups.length === 0 && <li className="empty">No groups — create one above</li>}
                    </ul>
                </div>
            </aside>

            <main className="mainPanel">
                <div className="panelHeader">Group Details</div>
                {!user && <div className="please">Please login to manage groups</div>}
                {user && (
                    <div className="panelBody">
                        <div className="inviteBlock">
                            <h4>Invite Member</h4>
                            <form onSubmit={invite} className="inviteForm">
                                <input value={inviteUser} onChange={(e) => setInviteUser(e.target.value)} placeholder="username to invite" />
                                <button type="submit" disabled={!selected} onClick={(e) => { if (!selected) { e.preventDefault(); return; } }}>Invite</button>
                            </form>
                            {selectedDetail && <div style={{ marginTop: 8, fontSize: 14 }}>Inviting to: <b>{selectedDetail.name}</b></div>}
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <h4>Invitations</h4>
                            {invites.length === 0 && <div>No pending invites</div>}
                            {invites.map((ig) => (
                                <div key={ig._id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                    <div style={{ flex: 1 }}>{ig.name}</div>
                                    <button className="openMapBtn" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => acceptInvite(ig._id)}>Accept</button>
                                    <button className="openMapBtn" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => declineInvite(ig._id)}>Decline</button>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 24 }}>
                            <button onClick={() => selectedDetail ? openGroupMap(selectedDetail) : navigate('/map')} className="openMapBtn">Open map</button>
                        </div>

                        <div style={{ marginTop: 18 }}>
                            <h4>Selected Group</h4>
                            {!selectedDetail && <div>Select a group from the left to see members</div>}
                            {selectedDetail && (
                                <div>
                                    <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{selectedDetail.name}</div>
                                    <div style={{ marginTop: 8 }}><b>Members ({selectedDetail.members.length})</b></div>
                                    <ul>
                                        {selectedDetail.members.map((m) => (
                                            <li key={m}>{m} {m === user && <button className="openMapBtn" style={{ marginLeft: 8, padding: '6px 10px', fontSize: 13 }} onClick={() => leaveGroup(selectedDetail._id)}>Leave</button>}</li>
                                        ))}
                                    </ul>
                                    {selectedDetail && selectedDetail.owner === user && (
                                        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                            <button className="openMapBtn" onClick={async () => {
                                                if (!window.confirm('Clear all pins in this group?')) return;
                                                try {
                                                    await axios.post(`/groups/${selectedDetail._id}/clear`, { username: user });
                                                    alert('Group pins cleared');
                                                } catch (err) { console.log(err); }
                                            }}>Clear Pins</button>
                                            <button className="openMapBtn" onClick={async () => {
                                                if (!window.confirm('Delete this group and all its pins?')) return;
                                                try {
                                                    await axios.delete(`/groups/${selectedDetail._id}`, { data: { username: user } });
                                                    // refresh list
                                                    const res = await axios.get(`/groups?username=${user}`);
                                                    setGroups(res.data || []);
                                                    setSelected(null);
                                                    setSelectedDetail(null);
                                                } catch (err) { console.log(err); }
                                            }}>Delete Group</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
