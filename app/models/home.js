
//app/models/user.js
//load the things we need
var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
// var bcrypt   = require('bcrypt-nodejs');

//define the schema for our user model
var familySchema = mongoose.Schema({
	created_date: Date,
	updated_date: Date,
	familyName: String,
	users: [
		{
			name: String,
			created_date: Date,
			updated_date: Date,
			socialLoginId: String,
			socialLoginType: String,
		}
	],	
	productList: [
		{
			name: String,
			created_date: Date,
			updated_date: Date,
			description: String,
			barcode: String,
			totalConsumed: Number
		}
	],//[{type: Schema.Types.ObjectId, ref: 'products'}],
	fridgeList: [
	{
		created_date: Date,
		updated_date: Date,
		product: 
			{
				name: String,
				description: String,
				barcode: String
			}
		,//[{ type: Schema.Types.ObjectId, ref: 'products' }],
		quantity: Number
	}
	],//[{type: Schema.Types.ObjectId, ref: 'listItems'}],
	garbageList: [
		{
			created_date: Date,
			updated_date: Date,
			product: 
				{
					name: String,
					description: String,
					barcode: String
				}
			,//[{ type: Schema.Types.ObjectId, ref: 'products' }],
			quantity: Number
		}
	],//[{type: Schema.Types.ObjectId, ref: 'listItems'}]
});

familySchema.pre('save', function(next) {
  // get the current date
  var currentDate = new Date();
  
  // change the updated_at field to current date
  this.updated_date = currentDate;

  // if created_at doesn't exist, add to that field
  if (!this.created_date)
    this.created_date = currentDate;

  next();
});

/*var productSchema = mongoose.Schema({
	_id:{type: Number, default: 1},
	name: String,
	created_date: Date,
	updated_date: Date,
	description: String,
	barcode: String
});

productSchema.pre('save', function(next) {
  // get the current date
  var currentDate = new Date();
  
  // change the updated_at field to current date
  this.updated_date = currentDate;

  // if created_at doesn't exist, add to that field
  if (!this.created_date)
    this.created_date = currentDate;

  next();
});

var listItemSchema = mongoose.Schema({
	_id:{type: Number, default,1},
	created_date: Date,
	updated_date: Date,
	product: [{ type: Schema.Types.ObjectId, ref: 'products' }],
	quantity: Number
});

listItemSchema.pre('save', function(next) {
  // get the current date
  var currentDate = new Date();
  
  // change the updated_at field to current date
  this.updated_date = currentDate;

  // if created_at doesn't exist, add to that field
  if (!this.created_date)
    this.created_date = currentDate;

  next();
});


var Product = mongoose.model('products', productSchema);
var ListItem = mongoose.model('listItems', listItemSchema);

findUserByLoginId = function(loginId, loginType){
	return User.find({socialLoginId : loginId, socialLoginType: loginType});
}

createUser = function(userData){
	var newUser = new User({
		name: userData.name;
		socialLoginId: userData.socialLoginId;
	});
	newUser.save(function(err){
		if (err) throw err;
	});
	return newUser;
}

addProductsToFridge = function(){
	
}*/

familySchema.plugin(autoIncrement.plugin, 'families');

var Family = mongoose.model('families', familySchema);
//create the model for users and expose it to our app
module.exports = Family;/*{
	User: User,
	Product: Product,
	ListItem: ListItem,
	findUserByLoginId: findUserByLoginId,
	createUser: createUser
}*/
