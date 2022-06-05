require('dotenv').config()
const PushBullet = require('pushbullet');
const request = require('superagent');

const PUSHBULLET_API_KEY = process.env.PUSHBULLET_API_KEY;
const PUSHBULLET_DEVICE_ID = process.env.PUSHBULLET_DEVICE_ID;
const SLEEP = process.env.SLEEP || 5000;

const CAMPSITES = [
  {
    campsiteName: "Lower Pines",
    id: 232450,
  },
  {
    campsiteName: "Upper Pines",
    id: 232447,
  }, 
  {
    campsiteName: "North Pines",
    id: 232449,
  },
];

const SITE_CACHE = {};

const getPushbulletDevice = () => {
  if (PUSHBULLET_DEVICE_ID) {
    return PUSHBULLET_DEVICE_ID;
  } else {
    throw new Error('Pushbullet Device ID Not Set');
  }
};

const getPushbulletApiKey = () => {
  if (PUSHBULLET_API_KEY) {
    return PUSHBULLET_API_KEY;
  } else {
    throw new Error('Pushbullet API Key Not Set');
  }
};

const PUSHBULLET = new PushBullet(getPushbulletApiKey());

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const checkAvailable = (body) => {
  return Object.values(body.campsites)
  .filter(a => Object.values(a.availabilities).includes('Available') )
  .map(availableDates => {
    const newAvailabilities = {};
    for (const [date, status] of Object.entries(availableDates.availabilities)) {
      if (status === 'Available') {
        newAvailabilities[date] = status;
      }
    }
    availableDates.availabilities = newAvailabilities;
    return availableDates;
  });
  // .reduce((a, i) => {
  //   if (i.availabilities['2019-09-28T00:00:00Z'] === 'Available') {
  //     a[i.site] = i;
  //   }
  //   return a;
  // }, {});
};

const sendNote = (campground, available = []) => {
  const unSentAvailable = available.filter(campsite => {
    if (!SITE_CACHE[campsite.campsite_id]) {
      SITE_CACHE[campsite.campsite_id] = Date.now();
      return true;
    } else {
      return false;
    }
  })

  console.log(campground, unSentAvailable);
  console.log(campground, unSentAvailable.length);
  if (unSentAvailable.length) {
    for (const newSite of unSentAvailable) {
      PUSHBULLET.note(getPushbulletDevice(), `${campground} Note (${newSite.site})`, JSON.stringify(newSite, null, 2))
    }
  }
};

const checkRecreation = async (site) => {
  try {
    const res = await request.get(`https://www.recreation.gov/api/camps/availability/campground/${site.id}/month?start_date=2022-09-01T00%3A00%3A00.000Z`)
    return checkAvailable(res.body);
  } catch (err) {
    console.log(err.status);
    return [];
  }
};

const run = async () => {
  getPushbulletApiKey();
  getPushbulletDevice();
  while(true) {
    for (const site of CAMPSITES) {
      const available = await checkRecreation(site);
      sendNote(site.campsiteName, available);
      await sleep(4000);
    }
  }
}

run()
  .catch(e => console.error(e));