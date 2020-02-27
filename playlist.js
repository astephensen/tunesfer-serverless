const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.spotifyClientId,
  clientSecret: process.env.spotifyClientSecret
});

const TRACK_FIELDS = 'total,next,items(track(name,artists(name),album(name),duration_ms))';

module.exports.getPlaylist = async event => {
  if (!event.pathParameters || !event.pathParameters.id) {
    return {
      statusCode: 400,
      body: 'You must provide a playlist ID',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      }
    }
  }
  const playlistId = event.pathParameters.id;

  // Authorization.
  const authorizationData = await spotifyApi.clientCredentialsGrant();
  const { expires_in: expiry, access_token: accessToken } = authorizationData.body;
  spotifyApi.setAccessToken(accessToken);

  // Store tokens for future requests.
  // TODO.

  const playlist = await spotifyApi.getPlaylist(playlistId, {
    fields: `id,name,description,images(url),owner(display_name),tracks(${TRACK_FIELDS})`
  });

  // Fetch all of the tracks in the playlist if specified.
  if (event.queryStringParameters && event.queryStringParameters.fetchAllTracks) {
    let next = playlist.body.tracks.next;
    while (next) {
      const [ _, offset ] = next.match(/tracks\?offset=([0-9]+)/);
      const tracksResponse = await spotifyApi.getPlaylistTracks(playlistId, {
        fields: TRACK_FIELDS,
        offset,
        size: 100
      });
      playlist.body.tracks.items = playlist.body.tracks.items.concat(tracksResponse.body.items);
      next = tracksResponse.body.next;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(playlist.body),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    }
  };
};
