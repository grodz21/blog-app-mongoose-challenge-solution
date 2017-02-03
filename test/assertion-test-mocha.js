const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');


// this makes the should syntax available throughout
// this module
const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);


//Random generated data using Faker library.
function seedBlogData() {
  console.info('seeding blog post data');
  const seedData = [];

  for (let i=1; i<=10; i++) {
    seedData.push(generateBlogData());
  }

 // this will return a promise
  return Blogpost.insertMany(seedData);
}

// used to generate data to put in db
// function generateTitleName() {
//   const boroughs = [
//     'Manhattan', 'Queens', 'Brooklyn', 'Bronx', 'Staten Island'];
//   return boroughs[Math.floor(Math.random() * boroughs.length)];
// }


// generate an object represnting a restaurant.
// can be used to generate seed data for db
// or request.body data
function generateBlogPostData() {
  return {
    author: faker.name.findName(),
    title: faker.lorem.word(),
    content: faker.lorem.paragraph()
  }
}

// this function deletes the entire database.
// we'll call it in an `afterEach` block below
// to ensure  data from one test does not stick
// around for next one
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}


describe('BlogPost API resource', function() {

  //This will remove any changes to the db before each assertion
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  })


// note the use of nested `describe` blocks.
  // this allows us to make clearer, more discrete tests that focus
  // on proving something small
  describe('GET endpoint', function() {

    it('should return all existing blogpost', function() {

    	let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          // so subsequent .then blocks can access resp obj.
          res = _res;
          res.should.have.status(200);
          // otherwise our db seeding didn't work
          res.body.posts.should.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          res.body.posts.should.have.length.of(count);
        });
    });


    it('should return blog posts with right fields', function() {
      // Get back all blog posts, and ensure they have expected keys

      let resBlogPost;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          res.should.have.status(200);
          res.should.be.json;
          res.body.posts.should.be.a('array');
          res.body.posts.should.have.length.of.at.least(1);

          res.body.posts.forEach(function(post) {
            post.should.be.a('object');
            post.should.include.keys(
              'title', 'author', 'content');
          });
          resBlogPost = res.body.post[0];
          return BlogPost.findById(resBlogPost.id);
        })
        .then(function(post) {

          resBlogPost.id.should.equal(post.id);
          resBlogPost.author.should.equal(post.author);
          resBlogPost.title.should.equal(post.title);
          resBlogPost.content.should.equal(post.content);
        });
    });
 });


  describe('POST endpoint', function() {
    // strategy: make a POST request with data,
    // then prove that the post we get back has
    // right keys, and that `id` is there (which means
    // the data was inserted into db)
    it('should add a new post', function() {

      const newPost = generateBlogPostData();

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys(
            'author', 'title', 'content');
          res.body.name.should.equal(newPost.name);
          // cause Mongo should have created id on insertion
          res.body.id.should.not.be.null;

          return BlogPost.findById(res.body.id);
        })
        .then(function(post) {
          post.author.should.equal(newPost.author);
          post.title.should.equal(newPost.title);
          post.content.should.equal(newPost.content);
        });
    });
  });


  describe('PUT endpoint', function() {

    // strategy:
    //  1. Get an existing post from db
    //  2. Make a PUT request to update that post
    //  3. Prove post returned by request contains data we sent
    //  4. Prove post in db is correctly updated
    it('should update fields you send over', function() {
      const updateData = {
        author: 'fofofofofofofof',
        title: 'futuristic fusion',
        content: 'This is a test content.  I should be updated.'
      };

      return BlogPost
        .findOne()
        .exec()
        .then(function(post) {
          updateData.id = post.id;

          // make request then inspect it to make sure it reflects
          // data we sent
          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(function(res) {
          res.should.have.status(204);

          return BlogPost.findById(updateData.id).exec();
        })
        .then(function(post) {
          post.author.should.equal(updateData.author);
          post.title.should.equal(updateData.title);
          post.content.should.equal(updateData.content);
        });
      });
  });


  describe('DELETE endpoint', function() {
    // strategy:
    //  1. get a post
    //  2. make a DELETE request for that post's id
    //  3. assert that response has right status code
    //  4. prove that post with the id doesn't exist in db anymore
    it('delete a post by id', function() {

      let post;

      return BlogPost
        .findOne()
        .exec()
        .then(function(_post) {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(function(res) {
          res.should.have.status(204);
          return BlogPost.findById(post.id).exec();
        })
        .then(function(_post) {
          // when a variable's value is null, chaining `should`
          // doesn't work. so `_post.should.be.null` would raise
          // an error. `should.be.null(_post)` is how we can
          // make assertions about a null value.
          should.not.exist(_post);
        });
    });
  });
});









