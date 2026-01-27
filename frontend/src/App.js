import "./app.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { Link } from "react-router-dom";

function formatTimeAgo(dateStr) {
  try {
    const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    const intervals = [
      [31536000, "year"],
      [2592000, "month"],
      [86400, "day"],
      [3600, "hour"],
      [60, "minute"],
      [1, "second"],
    ];
    for (const [sec, name] of intervals) {
      const count = Math.floor(seconds / sec);
      if (count > 0) return `${count} ${name}${count > 1 ? "s" : ""} ago`;
    }
    return "just now";
  } catch (e) {
    return "";
  }
}

function App() {
  const myStorage = window.localStorage;
  const [currentUsername, setCurrentUsername] = useState(
    myStorage.getItem("user"),
  );
  const [pins, setPins] = useState([]);
  const [newPlace, setNewPlace] = useState(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [activeGroup, setActiveGroup] = useState(
    window.localStorage.getItem("activeGroup") || null,
  );
  // login/register moved to separate pages
  const [groupInfo, setGroupInfo] = useState(null);
  const [reportingLocation, setReportingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(null);
  const userMarkersRef = useRef(null);
  const selfMarkerRef = useRef(null);
  const selfCircleRef = useRef(null);
  const tempMarkerRef = useRef(null);
  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current).setView([47.040182, 17.071727], 4);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    userMarkersRef.current = L.layerGroup().addTo(map);

    map.on("dblclick", (e) => {
      if (currentUsername) {
        setNewPlace({ lat: e.latlng.lat, long: e.latlng.lng });
      } else {
        alert("Log in to add a pin");
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.off();
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUsername]);

  // focus/zoom map on click to include clicked point and existing pins
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    // remove previous handler to avoid duplicates
    map.off("click");
    map.on("click", (e) => {
      try {
        const clicked = L.latLng(e.latlng.lat, e.latlng.lng);
        if (!pins || pins.length === 0) {
          map.setView(clicked, 14);
          return;
        }
        // find nearest pin to the clicked point
        let nearest = null;
        let minDist = Infinity;
        pins.forEach((p) => {
          const pl = L.latLng(p.lat, p.long);
          const d = clicked.distanceTo(pl);
          if (d < minDist) {
            minDist = d;
            nearest = pl;
          }
        });
        if (nearest) {
          try {
            map.setView(nearest, 16);
            return;
          } catch (e) {
            // ignore
          }
        }
        map.setView(clicked, 14);
      } catch (err) {
        // ignore
      }
    });
    return () => {
      map.off("click");
    };
  }, [pins]);

  useEffect(() => {
    const getPins = async () => {
      try {
        const url = activeGroup ? `/pins?group=${activeGroup}` : "/pins";
        const allPins = await axios.get(url);
        setPins(allPins.data);
      } catch (err) {
        console.log(err);
      }
    };
    getPins();
  }, [activeGroup]);

  // fetch active group info (name, owner)
  useEffect(() => {
    if (!activeGroup) {
      setGroupInfo(null);
      return;
    }
    const getGroup = async () => {
      try {
        const res = await axios.get(`/groups/${activeGroup}`);
        setGroupInfo(res.data);
      } catch (err) {
        console.log(err);
        setGroupInfo(null);
      }
    };
    getGroup();
  }, [activeGroup]);

  // poll for active users' locations and render them
  useEffect(() => {
    let mounted = true;
    let timer = null;
    const fetchActive = async () => {
      try {
        const url = activeGroup
          ? `/users/locations/active?group=${activeGroup}`
          : "/users/locations/active";
        const res = await axios.get(url);
        if (!mounted) return;
        if (!userMarkersRef.current) return;
        userMarkersRef.current.clearLayers();
        res.data.forEach((u) => {
          if (!u.location) return;
          const m = L.circleMarker([u.location.lat, u.location.long], {
            radius: 7,
            color: "#0b9aa0",
            fillColor: "#0b9aa0",
            fillOpacity: 0.9,
          }).addTo(userMarkersRef.current);
          // show username in a permanent tooltip label
          m.bindTooltip(u.username, {
            permanent: true,
            direction: "right",
            className: "user-label",
          });
          m.bindPopup(
            `<div><b>${u.username}</b><br/>Updated: ${u.location.updatedAt || ""}</div>`,
          );
          m.on("click", () => {
            try {
              mapInstanceRef.current.setView(m.getLatLng(), 14);
            } catch (e) {}
          });
        });
      } catch (e) {
        // ignore
      }
      timer = setTimeout(fetchActive, 5000);
    };
    fetchActive();
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // watch current user's geolocation and report it as active when `reportingLocation` is true
  // watch current user's geolocation and report it as active when `reportingLocation` is true
  useEffect(() => {
    if (!currentUsername || !navigator.geolocation || !reportingLocation)
      return;
    let watchId = null;
    try {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const long = pos.coords.longitude;
          setCurrentLocation({ lat, long });
          try {
            await axios.patch(`/users/${currentUsername}/location`, {
              lat,
              long,
              active: true,
            });
          } catch (e) {
            // ignore
          }
        },
        (err) => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
    } catch (e) {
      // geolocation not available or permission denied
    }
    return () => {
      if (watchId && navigator.geolocation)
        navigator.geolocation.clearWatch(watchId);
      // mark user inactive when stopping
      axios
        .patch(`/users/${currentUsername}/location`, {
          lat: null,
          long: null,
          active: false,
        })
        .catch(() => {});
      setCurrentLocation(null);
    };
  }, [currentUsername, reportingLocation]);

  // render a special self marker and circle when reportingLocation is active
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    // remove old self markers
    if (selfMarkerRef.current) {
      try {
        mapInstanceRef.current.removeLayer(selfMarkerRef.current);
      } catch (e) {}
      selfMarkerRef.current = null;
    }
    if (selfCircleRef.current) {
      try {
        mapInstanceRef.current.removeLayer(selfCircleRef.current);
      } catch (e) {}
      selfCircleRef.current = null;
    }
    if (reportingLocation && currentLocation) {
      try {
        // add a filled circle marker for user's exact location
        selfMarkerRef.current = L.circleMarker(
          [currentLocation.lat, currentLocation.long],
          {
            radius: 9,
            color: "#ff5b5b",
            fillColor: "#ff5b5b",
            fillOpacity: 0.9,
          },
        ).addTo(userMarkersRef.current);
        // add a subtle circle indicating area/accuracy (larger radius)
        selfCircleRef.current = L.circle(
          [currentLocation.lat, currentLocation.long],
          {
            radius: 200,
            color: "#ff5b5b",
            fillOpacity: 0.08,
          },
        ).addTo(mapInstanceRef.current);
        // center map on first go-live
        try {
          mapInstanceRef.current.setView(
            [currentLocation.lat, currentLocation.long],
            14,
          );
        } catch (e) {}
      } catch (e) {
        // ignore
      }
    }
    return () => {
      if (selfMarkerRef.current) {
        try {
          mapInstanceRef.current.removeLayer(selfMarkerRef.current);
        } catch (e) {}
        selfMarkerRef.current = null;
      }
      if (selfCircleRef.current) {
        try {
          mapInstanceRef.current.removeLayer(selfCircleRef.current);
        } catch (e) {}
        selfCircleRef.current = null;
      }
    };
  }, [reportingLocation, currentLocation]);

  // render pins as markers and fit map to bounds
  useEffect(() => {
    if (!markersRef.current || !mapInstanceRef.current) return;
    markersRef.current.clearLayers();
    const bounds = [];
    pins.forEach((p) => {
      const color = currentUsername === p.username ? "tomato" : "slateblue";
      const marker = L.circleMarker([p.lat, p.long], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.8,
      }).addTo(markersRef.current);
      let content = `<div class="card">\n<label>Place</label>\n<h4 class="place">${p.title}</h4>\n<label>Review</label>\n<p class="desc">${p.desc || ""}</p>\n<label>Information</label>\n<span class="username">Created by <b>${p.username}</b></span>\n<span class="date">${formatTimeAgo(p.createdAt)}</span>`;
      if (currentUsername === p.username) {
        content += `\n<button class="deletePinBtn" style="margin-top:8px">Delete Pin</button>`;
      }
      content += "\n</div>";
      marker.bindPopup(content);
      bounds.push([p.lat, p.long]);

      marker.on("click", () => {
        try {
          mapInstanceRef.current.setView(marker.getLatLng(), 14);
        } catch (e) {}
      });

      marker.on("popupopen", () => {
        try {
          const popupEl = marker.getPopup().getElement();
          const del =
            popupEl.querySelector && popupEl.querySelector(".deletePinBtn");
          if (del) {
            del.addEventListener("click", async () => {
              try {
                await axios.delete(`/pins/${p._id}`, {
                  data: { username: currentUsername },
                });
                setPins((prev) => prev.filter((pp) => pp._id !== p._id));
              } catch (err) {
                console.log(err);
              }
            });
          }
        } catch (e) {
          // ignore
        }
      });
    });

    if (mapInstanceRef.current && bounds.length > 0) {
      try {
        const latlngs = bounds.map((b) => L.latLng(b[0], b[1]));
        // if opened from Groups page, zoom to first pin instead of fitting bounds
        const openFrom = window.localStorage.getItem("openFromGroup");
        if (openFrom && activeGroup && openFrom === activeGroup) {
          try {
            mapInstanceRef.current.setView(latlngs[0], 16);
          } catch (e) {}
          window.localStorage.removeItem("openFromGroup");
          return;
        }
        const bb = L.latLngBounds(latlngs);
        mapInstanceRef.current.fitBounds(bb, { padding: [60, 60] });
      } catch (e) {
        console.log(e);
      }
    }
  }, [pins, currentUsername]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (newPlace) {
      tempMarkerRef.current = L.marker([newPlace.lat, newPlace.long]).addTo(
        mapInstanceRef.current,
      );
    } else {
      if (tempMarkerRef.current) {
        mapInstanceRef.current.removeLayer(tempMarkerRef.current);
        tempMarkerRef.current = null;
      }
    }
  }, [newPlace]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPlace) return;
    const newPin = {
      username: currentUsername,
      title,
      desc,
      lat: newPlace.lat,
      long: newPlace.long,
      group: activeGroup || null,
    };

    try {
      const res = await axios.post("/pins", newPin);
      setPins((prev) => [...prev, res.data]);
      setNewPlace(null);
      setTitle("");
      setDesc("");
    } catch (err) {
      console.log(err);
    }
  };

  const handleLogout = () => {
    // stop reporting before logout
    setReportingLocation(false);
    // mark inactive
    if (currentUsername) {
      axios
        .patch(`/users/${currentUsername}/location`, {
          lat: null,
          long: null,
          active: false,
        })
        .catch(() => {});
    }
    setCurrentUsername(null);
    myStorage.removeItem("user");
    setActiveGroup(null);
    window.localStorage.removeItem("activeGroup");
  };

  // listen for active group changes from other pages
  useEffect(() => {
    const onActive = (e) => {
      setActiveGroup(e?.detail || null);
    };
    window.addEventListener("activeGroupChanged", onActive);
    return () => window.removeEventListener("activeGroupChanged", onActive);
  }, []);

  const clearGroup = () => {
    setActiveGroup(null);
    window.localStorage.removeItem("activeGroup");
  };

  const clearGroupPins = async () => {
    if (!activeGroup) return;
    if (!window.confirm("Clear all pins in this group? This cannot be undone."))
      return;
    try {
      await axios.post(`/groups/${activeGroup}/clear`, {
        username: currentUsername,
      });
      setPins([]);
    } catch (err) {
      console.log(err);
    }
  };

  const deleteGroup = async () => {
    if (!activeGroup) return;
    if (
      !window.confirm(
        "Delete this group and all its pins? This cannot be undone.",
      )
    )
      return;
    try {
      await axios.delete(`/groups/${activeGroup}`, {
        data: { username: currentUsername },
      });
      // clear active group and pins
      setActiveGroup(null);
      window.localStorage.removeItem("activeGroup");
      setPins([]);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      {activeGroup && groupInfo && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 100,
            minWidth: 1100,
            justifyContent: "center",
          }}
        >
          {currentUsername && (
            <button
              className={`button ${reportingLocation ? "stopLive" : "goLive"}`}
              onClick={() => setReportingLocation((s) => !s)}
            >
              {reportingLocation ? "Stop Live" : "Go Live"}
            </button>
          )}
          <div
            style={{
              background: "rgba(255,255,255,0.85)",
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 26,
              fontWeight: 800,
              margin: "0 24px",
            }}
          >
            {groupInfo.name}
          </div>
          {currentUsername && (
            <button className="button logout" onClick={handleLogout}>
              Log out
            </button>
          )}
        </div>
      )}
      <div id="map" ref={mapRef} />

      {newPlace && (
        <div className="newPinForm">
          <form onSubmit={handleSubmit}>
            <label>Title</label>
            <input
              placeholder="Enter a title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <label>Description</label>
            <textarea
              placeholder="Say us something about this place."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            {/* rating removed */}
            <div style={{ marginTop: 8 }}>
              <button type="submit" className="submitButton">
                Add Pin
              </button>
              <button
                type="button"
                style={{ marginLeft: 8 }}
                onClick={() => setNewPlace(null)}
                className="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {currentUsername ? (
        activeGroup && groupInfo ? (
          <div
            style={{ position: "absolute", top: 12, left: 12, zIndex: 1000 }}
          >
            <Link to="/groups" className="button">
              Groups
            </Link>
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              pointerEvents: "auto",
              alignItems: "flex-start",
            }}
          >
            <button className="button logout" onClick={handleLogout}>
              Log out
            </button>
            <Link to="/groups" className="button">
              Groups
            </Link>
            <button
              className={`button ${reportingLocation ? "stopLive" : "goLive"}`}
              onClick={() => setReportingLocation((s) => !s)}
            >
              {reportingLocation ? "Stop Live" : "Go Live"}
            </button>
          </div>
        )
      ) : (
        <div
          style={{ position: "absolute", top: 12, left: 12, zIndex: 1000 }}
          className="buttons"
        >
          <Link to="/login" className="button login">
            Log in
          </Link>
          <Link to="/register" className="button register">
            Register
          </Link>
        </div>
      )}
    </div>
  );
}

export default App;
